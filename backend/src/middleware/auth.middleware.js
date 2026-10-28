import { getBearerToken } from "../utils/auth-token.js";
import { asyncHandler } from "../utils/async-handler.js";
import { loadActiveSession } from "../modules/auth/session.service.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const session = await loadActiveSession(getBearerToken(req));
  req.session = session;
  req.user = session.user;
  next();
});
