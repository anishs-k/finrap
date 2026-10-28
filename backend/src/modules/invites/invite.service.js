import bcrypt from "bcryptjs";
import { createSessionToken, hashToken } from "../../utils/auth-token.js";
import { addMinutes } from "../../utils/dates.js";
import { canInviteRole, hasPermission } from "../../utils/permissions.js";
import { forbidden, unprocessable } from "../../utils/http-error.js";
import { hasPublicApiPermission, sanitizePermissions } from "../../constants/permissions.js";
import { ACCOUNT_STATUS, KYC_STATUS, PLAN_STATUS, ROLES } from "../../constants/roles.js";
import { isStrongPassword } from "../../utils/password.js";
import { sendInviteCredentialsEmail } from "../../services/auth-email.service.js";
import { recordActivity } from "../activity/activity.service.js";
import { User } from "../users/user.model.js";
import { Wallet } from "../wallet/wallet.model.js";
import { ensureWalletForUser } from "../wallet/wallet.service.js";
import { Invite } from "./invite.model.js";

export async function listInvitesForUser(user) {
  const filter = user.role === "super_admin" ? {} : { $or: [{ sender: user._id }, { targetRole: user.role }] };
  const invites = await Invite.find(filter).sort({ createdAt: -1 }).limit(100);
  return invites.map(toInviteDto);
}

const USER_BLOCKED_PERMISSION_SET = new Set(["users.view", "users.invite", "roles.view", "roles.assign"]);
const INDIAN_STATE_CODES = new Set([
  "AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL",
  "OD", "PB", "RJ", "SK", "TN", "TS", "TR", "UP", "UK", "WB", "AN", "CH", "DN", "DL", "JK", "LA", "LD", "PY"
]);

export async function createInvite({
  user,
  name,
  email,
  targetRole,
  permissions,
  password,
  roadStreet,
  pincode,
  stateCode,
  gstin,
  pan,
  contact
}) {
  if (!canInviteRole(user.role, targetRole)) {
    throw forbidden("This role cannot invite the selected account type");
  }

  const normalizedEmail = String(email || "").toLowerCase().trim();
  const displayName = String(name || "").trim();

  if (!normalizedEmail || !displayName) {
    throw unprocessable("Name and email are required");
  }

  const profile = normalizeInviteProfile({ roadStreet, pincode, stateCode, gstin, pan, contact });

  const accountPassword = String(password || "");
  if (!isStrongPassword(accountPassword)) {
    throw unprocessable("Password must include lowercase, uppercase, number, special character and at least 8 characters");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw unprocessable("An account already exists with this email");
  }

  const token = createSessionToken();
  const passwordHash = await bcrypt.hash(accountPassword, 12);
  const safePermissions = filterInvitePermissions({
    inviter: user,
    targetRole,
    permissions: sanitizePermissions(permissions, targetRole)
  });
  const publicApiToken = await resolveInvitePublicApiToken(user, safePermissions);
  const whiteLabelApiDomain = String(user.whiteLabelApiDomain || "").trim();
  const invitedUser = await User.create({
    name: displayName,
    email: normalizedEmail,
    ...profile,
    passwordHash,
    role: targetRole,
    status: ACCOUNT_STATUS.INVITED,
    planStatus: targetRole === ROLES.USER ? PLAN_STATUS.CONSUMER : PLAN_STATUS.INACTIVE,
    kycStatus: KYC_STATUS.NOT_REQUIRED,
    permissions: safePermissions,
    publicApiToken,
    whiteLabelApiDomain,
    issuedPassword: accountPassword,
    parent: user._id,
    invitedBy: user._id,
    passwordChangedAt: new Date()
  });

  const invite = await Invite.create({
    name: displayName,
    email: normalizedEmail,
    targetRole,
    sender: user._id,
    senderRole: user.role,
    permissions: safePermissions,
    tokenHash: hashToken(token),
    expiresAt: addMinutes(new Date(), 60 * 24 * 7)
  });
  try {
    await ensureWalletForUser(invitedUser);
    await sendInviteCredentialsEmail({
      to: normalizedEmail,
      name: displayName,
      role: targetRole,
      password: accountPassword,
      apiToken: publicApiToken,
      apiBaseUrl: whiteLabelApiDomain || undefined,
      invitedBy: user
    });
  } catch (error) {
    await Promise.allSettled([
      User.deleteOne({ _id: invitedUser._id }),
      Invite.deleteOne({ _id: invite._id }),
      Wallet.deleteOne({ user: invitedUser._id })
    ]);
    throw unprocessable("Invite email could not be sent. Please verify email settings and try again.");
  }

  await recordActivity({
    user,
    action: `${user.name} invited ${displayName} as ${targetRole}`,
    service: "Invites",
    notifyUsers: user.role === ROLES.SUPER_ADMIN ? [] : [user._id],
    notifySuperAdmins: user.role !== ROLES.SUPER_ADMIN
  });

  return { invite: toInviteDto(invite), inviteToken: token };
}

async function resolveInvitePublicApiToken(inviter, permissions) {
  if (!hasPublicApiPermission(permissions)) return "";
  return createSessionToken();
}

function normalizeInviteProfile({ roadStreet, pincode, stateCode, gstin, pan, contact }) {
  const cleanPincode = String(pincode || "").replace(/\D/g, "");
  const cleanStateCode = String(stateCode || "").trim().toUpperCase();
  const cleanGstin = String(gstin || "").trim().toUpperCase();
  const cleanPan = String(pan || "").trim().toUpperCase();
  const cleanContact = normalizeInvitePhone(contact);

  if (cleanPincode && !/^\d{6}$/.test(cleanPincode)) {
    throw unprocessable("Pincode must be a valid 6 digit pincode");
  }
  if (cleanStateCode && !INDIAN_STATE_CODES.has(cleanStateCode)) {
    throw unprocessable("Choose a valid state code");
  }
  if (cleanPan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan)) {
    throw unprocessable("PAN must be valid");
  }
  if (cleanGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(cleanGstin)) {
    throw unprocessable("GSTIN must be valid");
  }
  if (cleanContact && !isValidInvitePhone(cleanContact)) {
    throw unprocessable("Contact must be a valid Indian mobile number");
  }

  return {
    roadStreet: String(roadStreet || "").trim(),
    pincode: cleanPincode,
    stateCode: cleanStateCode,
    gstin: cleanGstin,
    pan: cleanPan,
    contact: cleanContact
  };
}

function normalizeInvitePhone(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return raw.startsWith("+91") ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
  }
  return raw;
}

function isValidInvitePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return /^[6-9]\d{9}$/.test(digits);
}

function filterInvitePermissions({ inviter, targetRole, permissions }) {
  return permissions.filter((permission) => {
    if (targetRole === ROLES.USER && USER_BLOCKED_PERMISSION_SET.has(permission)) return false;
    return inviter.role === ROLES.SUPER_ADMIN || hasPermission(inviter, permission);
  });
}

export function toInviteDto(invite) {
  return {
    id: String(invite._id),
    email: invite.email,
    name: invite.name,
    targetRole: invite.targetRole,
    senderRole: invite.senderRole,
    permissions: invite.permissions,
    status: invite.status,
    createdAt: invite.createdAt
  };
}
