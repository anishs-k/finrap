import bcrypt from "bcryptjs";
import { hasPublicApiPermission } from "../../constants/permissions.js";
import { ACCOUNT_STATUS, KYC_STATUS, ROLES } from "../../constants/roles.js";
import { forbidden, tooManyRequests, unauthorized, unprocessable } from "../../utils/http-error.js";
import { createSessionToken, hashToken } from "../../utils/auth-token.js";
import { addMinutes } from "../../utils/dates.js";
import { generateOtp, isStrongPassword } from "../../utils/password.js";
import { toUserDto } from "../../utils/sanitize.js";
import { sendPasswordResetOtpEmail } from "../../services/auth-email.service.js";
import { recordActivity } from "../activity/activity.service.js";
import { User } from "../users/user.model.js";
import { ensureWalletForUser } from "../wallet/wallet.service.js";
import { Session } from "./session.model.js";
import { createSession } from "./session.service.js";

const PASSWORD_RESET_COOLDOWN_MS = 30 * 1000;
const PASSWORD_RESET_MESSAGE = "If an account exists, an OTP has been sent.";
const PASSWORD_RESET_OTP_MINUTES = 10;
const PASSWORD_RESET_TOKEN_MINUTES = 10;
const BLOCKED_MESSAGE = "Your account has been blocked. Please contact support.";
const DELETED_MESSAGE = "Your account has been deleted. Please contact support.";

export async function loginWithPassword({ email, password, req }) {
  const user = await User.findOne({ email: String(email || "").toLowerCase().trim() }).select("+passwordHash");

  if (!user) {
    throw unauthorized("Invalid credentials");
  }

  assertNotBlocked(user);

  const passwordMatches = await bcrypt.compare(String(password || ""), user.passwordHash);
  if (!passwordMatches) {
    throw unauthorized("Invalid credentials");
  }

  const now = new Date();
  const wasInvited = user.status === ACCOUNT_STATUS.INVITED;
  user.status = ACCOUNT_STATUS.ACTIVE;
  if (wasInvited && user.role !== ROLES.SUPER_ADMIN && !user.kycStatus) {
    user.kycStatus = KYC_STATUS.NOT_STARTED;
  }
  user.lastLoginAt = now;
  await user.save();

  if (wasInvited) {
    await recordActivity({ user, action: "Activated account on first login", service: "Auth" });
  }

  const { token } = await createSession({ user, req });
  const wallet = await ensureWalletForUser(user);
  return {
    token,
    user: toUserDto(user, wallet, {
      includePublicApiToken: user.role === ROLES.SUPER_ADMIN || hasPublicApiPermission(user.permissions)
    })
  };
}

export async function requestForgotPassword({ email }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    throw unprocessable("Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw unprocessable("This email is not registered with us.");
  }

  assertNotBlocked(user);
  assertCanResetPassword(user);

  const lastSentAt = user.passwordResetLastSentAt?.getTime() || 0;
  const elapsed = Date.now() - lastSentAt;
  if (elapsed < PASSWORD_RESET_COOLDOWN_MS) {
    const seconds = Math.ceil((PASSWORD_RESET_COOLDOWN_MS - elapsed) / 1000);
    throw tooManyRequests(`Please wait ${seconds} seconds before requesting another password email.`);
  }

  const previousResetSentAt = user.passwordResetLastSentAt;
  const previousOtpHash = user.passwordResetOtpHash;
  const previousOtpExpiresAt = user.passwordResetOtpExpiresAt;
  const previousTokenHash = user.passwordResetTokenHash;
  const previousTokenExpiresAt = user.passwordResetTokenExpiresAt;
  const otp = generateOtp();
  const now = new Date();

  user.passwordResetOtpHash = hashToken(otp);
  user.passwordResetOtpExpiresAt = addMinutes(now, PASSWORD_RESET_OTP_MINUTES);
  user.passwordResetTokenHash = "";
  user.passwordResetTokenExpiresAt = null;
  user.passwordResetLastSentAt = now;
  await user.save();

  try {
    await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp
    });
  } catch {
    user.passwordResetLastSentAt = previousResetSentAt;
    user.passwordResetOtpHash = previousOtpHash;
    user.passwordResetOtpExpiresAt = previousOtpExpiresAt;
    user.passwordResetTokenHash = previousTokenHash;
    user.passwordResetTokenExpiresAt = previousTokenExpiresAt;
    await user.save();
    throw unprocessable("OTP email could not be sent. Please try again later.");
  }

  await recordActivity({ user, action: "Requested password reset OTP", service: "Auth" });

  return { ok: true, message: PASSWORD_RESET_MESSAGE };
}

export async function verifyForgotPasswordOtp({ email, otp }) {
  const user = await findPasswordResetUser(email);
  const normalizedOtp = String(otp || "").trim();

  if (!normalizedOtp) {
    throw unprocessable("OTP is required");
  }

  assertValidOtp(user, normalizedOtp);

  const resetToken = createSessionToken();
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetTokenExpiresAt = addMinutes(new Date(), PASSWORD_RESET_TOKEN_MINUTES);
  await user.save();

  return { ok: true, resetToken, message: "OTP verified" };
}

export async function resetForgotPassword({ email, resetToken, password, confirmPassword }) {
  const user = await findPasswordResetUser(email);
  const token = String(resetToken || "").trim();
  const nextPassword = String(password || "");
  const nextConfirmPassword = String(confirmPassword || "");

  if (!token || hashToken(token) !== user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt <= new Date()) {
    throw unprocessable("Password reset session expired. Please verify OTP again.");
  }

  if (!isStrongPassword(nextPassword)) {
    throw unprocessable("Password must include lowercase, uppercase, number, special character and at least 8 characters");
  }

  if (nextPassword !== nextConfirmPassword) {
    throw unprocessable("Passwords do not match");
  }

  const now = new Date();
  user.passwordHash = await bcrypt.hash(nextPassword, 12);
  user.passwordChangedAt = now;
  user.passwordResetOtpHash = "";
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetTokenHash = "";
  user.passwordResetTokenExpiresAt = null;
  await user.save();

  await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: now });
  await recordActivity({ user, action: "Reset password with OTP", service: "Auth" });

  return { ok: true, message: "Password updated. You can sign in now." };
}

async function findPasswordResetUser(email) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (!normalizedEmail) {
    throw unprocessable("Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user) {
    throw unprocessable("Invalid or expired password reset request");
  }

  assertNotBlocked(user);
  assertCanResetPassword(user);

  return user;
}

function assertNotBlocked(user) {
  if (user.deletedAt) {
    throw forbidden(DELETED_MESSAGE);
  }
  if (user.status === ACCOUNT_STATUS.SUSPENDED) {
    throw forbidden(BLOCKED_MESSAGE);
  }
}

function assertCanResetPassword(user) {
  if (user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("You are not allowed to change the password");
  }
}

function assertValidOtp(user, otp) {
  if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt <= new Date()) {
    throw unprocessable("OTP expired. Please request a new OTP.");
  }

  if (hashToken(otp) !== user.passwordResetOtpHash) {
    throw unprocessable("Invalid OTP");
  }
}
