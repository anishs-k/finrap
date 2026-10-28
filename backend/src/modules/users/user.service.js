import bcrypt from "bcryptjs";
import { hasPublicApiPermission, sanitizePermissions } from "../../constants/permissions.js";
import { ACCOUNT_STATUS, KYC_STATUS, ROLES } from "../../constants/roles.js";
import { createSessionToken } from "../../utils/auth-token.js";
import { toUserDto } from "../../utils/sanitize.js";
import { canInviteRole, hasPermission, visibleUserFilter } from "../../utils/permissions.js";
import { forbidden, unprocessable } from "../../utils/http-error.js";
import { isStrongPassword } from "../../utils/password.js";
import { parsePagination } from "../../utils/pagination.js";
import { dateSearchClauses, roleSearchValues, searchPattern } from "../../utils/list-search.js";
import { Session } from "../auth/session.model.js";
import { sendAccountReactivatedEmail } from "../../services/auth-email.service.js";
import { ensureWalletForUser, ensureWalletsForUsers } from "../wallet/wallet.service.js";
import { ensureUpstreamApiAccess } from "./api-access-inheritance.service.js";
import { User } from "./user.model.js";

const USER_BLOCKED_PERMISSION_SET = new Set(["users.view", "users.invite", "roles.view", "roles.assign"]);
const INDIAN_STATE_CODES = new Set([
  "AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL",
  "OD", "PB", "RJ", "SK", "TN", "TS", "TR", "UP", "UK", "WB", "AN", "CH", "DN", "DL", "JK", "LA", "LD", "PY"
]);

export async function listUsersForUser(user, query = {}) {
  const pagination = parsePagination(query, { defaultLimit: 50, maxLimit: 500 });
  const filter = await withUserSearch(withStatusFilter(withKycFilter({
    $and: [visibleUserFilter(user), { _id: { $ne: user._id } }]
  }, query.kyc), query.status), query.search);
  const usersQuery = User.find(filter)
    .select("-passwordHash -passwordResetOtpHash -passwordResetTokenHash -kyc.aadhaar.providerResponse -kyc.esign.providerResponse -kyc.pan.providerResponse")
    .populate("invitedBy", "name email role")
    .sort({ createdAt: -1 });
  const [users, total] = pagination.enabled
    ? await Promise.all([
        usersQuery.skip(pagination.skip).limit(pagination.limit),
        User.countDocuments(filter)
      ])
    : [await usersQuery, null];
  const walletsByUser = await ensureWalletsForUsers(users);
  const items = users.map((account) =>
    toUserDto(account, walletsByUser.get(String(account._id)), {
      includeSensitiveKyc: user.role === ROLES.SUPER_ADMIN,
      includePublicApiToken: canManageUserDetails(user, account),
      includeIssuedPassword: canManageUserDetails(user, account)
    })
  );

  if (!pagination.enabled) {
    return items;
  }

  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit))
    }
  };
}

function withKycFilter(filter, kyc) {
  if (kyc === "verified") {
    return {
      $and: [
        filter,
        { kycStatus: { $in: [KYC_STATUS.VERIFIED, KYC_STATUS.NOT_REQUIRED] } }
      ]
    };
  }

  if (kyc === "unverified") {
    return {
      $and: [
        filter,
        { kycStatus: { $nin: [KYC_STATUS.VERIFIED, KYC_STATUS.NOT_REQUIRED] } }
      ]
    };
  }

  return filter;
}

function withStatusFilter(filter, status) {
  if (status === "active") {
    return {
      $and: [
        filter,
        { status: ACCOUNT_STATUS.ACTIVE },
        {
          $or: [
            { invitedBy: null },
            { lastLoginAt: { $ne: null } }
          ]
        }
      ]
    };
  }

  if (status === "not_active") {
    return {
      $and: [
        filter,
        {
          $or: [
            { status: ACCOUNT_STATUS.INVITED },
            { status: ACCOUNT_STATUS.ACTIVE, invitedBy: { $ne: null }, lastLoginAt: null }
          ]
        }
      ]
    };
  }

  if (status === "blocked") {
    return {
      $and: [filter, { status: ACCOUNT_STATUS.SUSPENDED }]
    };
  }

  return filter;
}

async function withUserSearch(filter, search) {
  const term = String(search || "").trim();
  if (!term) return filter;

  const pattern = searchPattern(term);
  const matchedRoles = roleSearchValues(term);
  const matchedInviters = await User.find({
    $or: [
      { name: pattern },
      { email: pattern },
      { role: { $in: matchedRoles.length ? matchedRoles : [term] } }
    ]
  }).select("_id");
  const statusClauses = [];
  const normalized = term.toLowerCase().replace(/[\s_-]+/g, " ").trim();
  if (normalized.includes("not active") || normalized.includes("invited")) {
    statusClauses.push({ status: ACCOUNT_STATUS.ACTIVE, invitedBy: { $ne: null }, lastLoginAt: null });
  }
  if (normalized === "active" || normalized.includes("active account")) {
    statusClauses.push({ status: ACCOUNT_STATUS.ACTIVE });
  }
  if (normalized.includes("blocked") || normalized.includes("suspended")) {
    statusClauses.push({ status: ACCOUNT_STATUS.SUSPENDED });
  }
  const clauses = [
    { name: pattern },
    { email: pattern },
    { role: pattern },
    { status: pattern },
    { kycStatus: pattern },
    { planStatus: pattern },
    { roadStreet: pattern },
    { pincode: pattern },
    { stateCode: pattern },
    { gstin: pattern },
    { pan: pattern },
    { contact: pattern },
    ...dateSearchClauses("createdAt", term),
    ...statusClauses
  ];
  if (matchedRoles.length > 0) {
    clauses.push({ role: { $in: matchedRoles } });
  }
  if (matchedInviters.length > 0) {
    clauses.push({ invitedBy: { $in: matchedInviters.map((account) => account._id) } });
  }
  return {
    $and: [
      filter,
      { $or: clauses }
    ]
  };
}

export async function updateProfile(user, payload) {
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").toLowerCase().trim();
  const password = String(payload.password || "");

  if (!name || !email) {
    throw unprocessable("Name and email are required");
  }

  const emailOwner = await User.findOne({ email, _id: { $ne: user._id } });
  if (emailOwner) {
    throw unprocessable("Email is already in use");
  }

  user.name = name;
  user.email = email;
  applyBillingProfileFields(user, payload);

  if (Object.hasOwn(payload, "avatarUrl")) {
    user.avatarUrl = payload.avatarUrl || "";
  }

  if (password) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw forbidden("You are not allowed to change the password");
    }
    if (!isStrongPassword(password)) {
      throw unprocessable("Password must include lowercase, uppercase, number, special character and at least 8 characters");
    }
    user.passwordHash = await bcrypt.hash(password, 12);
  }

  await user.save();
  const wallet = await ensureWalletForUser(user);
  return toUserDto(user, wallet, {
    includeSensitiveKyc: user.role === ROLES.SUPER_ADMIN,
    includePublicApiToken: user.role === ROLES.SUPER_ADMIN
  });
}

function applyBillingProfileFields(user, payload) {
  const roadStreet = String(payload.roadStreet || "").trim();
  const pincode = String(payload.pincode || "").replace(/\D/g, "");
  const stateCode = String(payload.stateCode || "").trim().toUpperCase();
  const gstin = String(payload.gstin || "").trim().toUpperCase();
  const pan = String(payload.pan || "").trim().toUpperCase();
  const contact = normalizeProfilePhone(payload.contact);

  if (pincode && !/^\d{6}$/.test(pincode)) {
    throw unprocessable("Pincode must be a valid 6 digit pincode");
  }
  if (stateCode && !INDIAN_STATE_CODES.has(stateCode)) {
    throw unprocessable("Choose a valid state code");
  }
  if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
    throw unprocessable("PAN must be valid");
  }
  if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    throw unprocessable("GSTIN must be valid");
  }
  if (contact && !isValidProfilePhone(contact)) {
    throw unprocessable("Contact must be a valid Indian mobile number");
  }

  user.roadStreet = roadStreet;
  user.pincode = pincode;
  user.stateCode = stateCode;
  user.gstin = gstin;
  user.pan = pan;
  user.contact = contact;
}

function normalizeProfilePhone(value) {
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

function isValidProfilePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return /^[6-9]\d{9}$/.test(digits);
}

export async function updateUserStatus({ admin, userId, status }) {
  if (admin.role === ROLES.USER) {
    throw forbidden("You are not allowed to block or unblock accounts");
  }

  const nextStatus = String(status || "").trim();
  if (![ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.SUSPENDED].includes(nextStatus)) {
    throw unprocessable("Choose a valid account status");
  }

  if (String(admin._id) === String(userId)) {
    throw unprocessable("You cannot block your own account");
  }

  const user = await User.findOne({
    $and: [visibleUserFilter(admin), { _id: userId }]
  }).populate("invitedBy", "name email role");
  if (!user) {
    throw unprocessable("User was not found");
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("Super admin account cannot be blocked");
  }

  if (admin.role !== ROLES.SUPER_ADMIN && !canInviteRole(admin.role, user.role)) {
    throw forbidden("You cannot block or unblock this account");
  }

  const wasSuspended = user.status === ACCOUNT_STATUS.SUSPENDED;
  const shouldSendReactivationEmail = wasSuspended && nextStatus === ACCOUNT_STATUS.ACTIVE;
  const shouldIncludeApiToken = shouldSendReactivationEmail && hasPublicApiPermission(user.permissions);

  user.status = nextStatus;
  await user.save();
  if (nextStatus === ACCOUNT_STATUS.SUSPENDED) {
    await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  }
  if (shouldSendReactivationEmail) {
    await sendAccountReactivatedEmail({
      to: user.email,
      name: user.name,
      role: user.role,
      password: user.issuedPassword || "",
      apiToken: shouldIncludeApiToken ? user.publicApiToken : "",
      apiBaseUrl: user.whiteLabelApiDomain || undefined,
      updatedBy: admin
    });
  }
  const wallet = await ensureWalletForUser(user);
  return toUserDto(user, wallet, {
    includeSensitiveKyc: admin.role === ROLES.SUPER_ADMIN,
    includePublicApiToken: canManageUserDetails(admin, user),
    includeIssuedPassword: canManageUserDetails(admin, user)
  });
}

export async function softDeleteUser({ admin, userId }) {
  if (admin.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only the super admin can delete accounts");
  }

  if (String(admin._id) === String(userId)) {
    throw unprocessable("You cannot delete your own account");
  }

  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) {
    throw unprocessable("User was not found");
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("Super admin account cannot be deleted");
  }

  const deletedAt = new Date();
  user.deletedAt = deletedAt;
  user.status = ACCOUNT_STATUS.SUSPENDED;
  await user.save();
  await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: deletedAt });

  return {
    deleted: true,
    userId: String(user._id),
    deletedAt
  };
}

export async function updateUserPassword({ admin, userId, password }) {
  if (admin.role === ROLES.USER) {
    throw forbidden("You are not allowed to change customer passwords");
  }

  if (String(admin._id) === String(userId)) {
    throw unprocessable("Use profile settings to change the super admin password");
  }

  const nextPassword = String(password || "");
  if (!isStrongPassword(nextPassword)) {
    throw unprocessable("Password must include lowercase, uppercase, number, special character and at least 8 characters");
  }

  const user = await User.findOne({
    $and: [visibleUserFilter(admin), { _id: userId }]
  }).populate("invitedBy", "name email role");
  if (!user) {
    throw unprocessable("User was not found");
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("Super admin password cannot be changed from user management");
  }

  if (admin.role !== ROLES.SUPER_ADMIN && !canInviteRole(admin.role, user.role)) {
    throw forbidden("You cannot change this account password");
  }

  user.passwordHash = await bcrypt.hash(nextPassword, 12);
  user.issuedPassword = nextPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  const wallet = await ensureWalletForUser(user);
  return toUserDto(user, wallet, {
    includeSensitiveKyc: admin.role === ROLES.SUPER_ADMIN,
    includePublicApiToken: canManageUserDetails(admin, user),
    includeIssuedPassword: canManageUserDetails(admin, user)
  });
}

export async function updateUserPermissions({ admin, userId, permissions }) {
  if (admin.role !== ROLES.SUPER_ADMIN && !hasPermission(admin, "roles.assign")) {
    throw forbidden("You do not have permission to edit account permissions");
  }

  if (String(admin._id) === String(userId)) {
    throw unprocessable("You cannot edit your own permissions");
  }

  if (!Array.isArray(permissions)) {
    throw unprocessable("Choose at least one permissions list");
  }

  const user = await User.findOne({
    $and: [visibleUserFilter(admin), { _id: userId }]
  }).populate("invitedBy", "name email role");
  if (!user) {
    throw unprocessable("User was not found");
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("Super admin permissions cannot be edited");
  }

  if (admin.role !== ROLES.SUPER_ADMIN && !canInviteRole(admin.role, user.role)) {
    throw forbidden("You cannot edit permissions for this role");
  }

  const sanitized = filterAssignablePermissions({
    admin,
    targetRole: user.role,
    permissions: sanitizePermissions(permissions, user.role)
  });
  user.permissions = sanitized;
  if (hasPublicApiPermission(user.permissions) && !user.publicApiToken) {
    user.publicApiToken = await resolveEditedUserPublicApiToken(admin);
  }
  if (!hasPublicApiPermission(user.permissions)) {
    user.publicApiToken = "";
  }
  await user.save();
  await ensureUpstreamApiAccess({
    actor: admin,
    targetUser: user,
    permissions: user.permissions,
    pricing: user.apiPricing
  });

  const wallet = await ensureWalletForUser(user);
  return toUserDto(user, wallet, {
    includePublicApiToken: canManageUserDetails(admin, user),
    includeIssuedPassword: canManageUserDetails(admin, user)
  });
}

async function resolveEditedUserPublicApiToken(admin) {
  return createSessionToken();
}

function filterAssignablePermissions({ admin, targetRole, permissions }) {
  return permissions.filter((permission) => {
    if (targetRole === ROLES.USER && USER_BLOCKED_PERMISSION_SET.has(permission)) return false;
    return admin.role === ROLES.SUPER_ADMIN || hasPermission(admin, permission);
  });
}

function canManageUserDetails(admin, account) {
  if (admin.role === ROLES.SUPER_ADMIN) return true;
  if (admin.role === ROLES.USER || String(admin._id) === String(account._id)) return false;
  return canInviteRole(admin.role, account.role);
}

export async function regeneratePublicApiToken(user) {
  if (user.role !== ROLES.SUPER_ADMIN && !hasPublicApiPermission(user.permissions)) {
    throw forbidden("Public API access is not enabled for this account");
  }

  user.publicApiToken = createSessionToken();
  await user.save();

  const wallet = await ensureWalletForUser(user);
  return toUserDto(user, wallet, { includePublicApiToken: true });
}
