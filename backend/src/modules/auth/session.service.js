import { env } from "../../config/env.js";
import { ACCOUNT_STATUS } from "../../constants/roles.js";
import { addMinutes } from "../../utils/dates.js";
import { createSessionToken, hashToken } from "../../utils/auth-token.js";
import { forbidden, unauthorized } from "../../utils/http-error.js";
import { Session } from "./session.model.js";

const MIN_TOUCH_INTERVAL_MS = 30 * 1000;
const MAX_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function createSession({ user, req }) {
  const token = createSessionToken();
  const now = new Date();

  const session = await Session.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: addMinutes(now, env.sessionIdleMinutes),
    lastSeenAt: now,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || ""
  });

  return { token, session };
}

export async function loadActiveSession(token) {
  if (!token) {
    throw unauthorized("Session token is required");
  }

  const session = await Session.findOne({
    tokenHash: hashToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).populate("user");

  if (!session || !session.user) {
    throw unauthorized("Session expired. Please sign in again.");
  }

  if (session.user.deletedAt) {
    throw forbidden("Your account has been deleted. Please contact support.");
  }

  if (session.user.status === ACCOUNT_STATUS.SUSPENDED) {
    throw forbidden("Your account has been blocked. Please contact support.");
  }

  const now = new Date();
  if (shouldTouchSession(session, now)) {
    const expiresAt = addMinutes(now, env.sessionIdleMinutes);
    await Session.updateOne(
      { _id: session._id, revokedAt: null },
      {
        $set: {
          lastSeenAt: now,
          expiresAt
        }
      }
    );
    session.lastSeenAt = now;
    session.expiresAt = expiresAt;
  }

  return session;
}

export async function revokeSession(token) {
  if (!token) return;

  await Session.findOneAndUpdate(
    { tokenHash: hashToken(token), revokedAt: null },
    { revokedAt: new Date() },
    { new: true }
  );
}

function shouldTouchSession(session, now) {
  const idleMs = Math.max(MIN_TOUCH_INTERVAL_MS, env.sessionIdleMinutes * 60 * 1000);
  const touchIntervalMs = Math.min(MAX_TOUCH_INTERVAL_MS, Math.max(MIN_TOUCH_INTERVAL_MS, idleMs / 3));
  const lastSeenAt = session.lastSeenAt?.getTime?.() || 0;
  const expiresAt = session.expiresAt?.getTime?.() || 0;
  const nowMs = now.getTime();

  return nowMs - lastSeenAt >= touchIntervalMs || expiresAt - nowMs <= touchIntervalMs;
}
