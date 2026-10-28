import { asyncHandler } from "../../utils/async-handler.js";
import { getBearerToken } from "../../utils/auth-token.js";
import { sendOk } from "../../utils/response.js";
import { toUserDto } from "../../utils/sanitize.js";
import { hasPublicApiPermission } from "../../constants/permissions.js";
import { ROLES } from "../../constants/roles.js";
import { ensureWalletForUser } from "../wallet/wallet.service.js";
import { loginWithPassword, requestForgotPassword, resetForgotPassword, verifyForgotPasswordOtp } from "./auth.service.js";
import { revokeSession } from "./session.service.js";

export const login = asyncHandler(async (req, res) => {
  const payload = await loginWithPassword({
    email: req.body.email,
    password: req.body.password,
    req
  });

  sendOk(res, payload);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const payload = await requestForgotPassword({
    email: req.body.email
  });

  sendOk(res, payload);
});

export const verifyForgotPassword = asyncHandler(async (req, res) => {
  const payload = await verifyForgotPasswordOtp({
    email: req.body.email,
    otp: req.body.otp
  });

  sendOk(res, payload);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const payload = await resetForgotPassword({
    email: req.body.email,
    resetToken: req.body.resetToken,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword
  });

  sendOk(res, payload);
});

export const me = asyncHandler(async (req, res) => {
  const wallet = await ensureWalletForUser(req.user);
  sendOk(res, {
    user: toUserDto(req.user, wallet, {
      includePublicApiToken: req.user.role === ROLES.SUPER_ADMIN || hasPublicApiPermission(req.user.permissions)
    })
  });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSession(getBearerToken(req));
  sendOk(res, { ok: true });
});
