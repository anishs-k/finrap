import { ACCOUNT_STATUS, INVITE_MATRIX, ROLES } from "../constants/roles.js";

export function canInviteRole(senderRole, targetRole) {
  return INVITE_MATRIX[senderRole]?.includes(targetRole) || false;
}

export function nextInviteRole(role) {
  return INVITE_MATRIX[role]?.[0] || null;
}

export function canCreatePlans(role) {
  return role !== ROLES.USER;
}

export function hasPermission(user, permission) {
  return user.role === ROLES.SUPER_ADMIN || user.permissions?.includes(permission);
}

export function canRunVerification(user) {
  return Boolean(user && user.status !== ACCOUNT_STATUS.SUSPENDED);
}

export function canReviewKyc(reviewer, targetUser) {
  if (reviewer.role === ROLES.SUPER_ADMIN) return true;
  // Agent/sub-agent KYC review is intentionally disabled for now.
  // const reviewerId = String(reviewer._id || reviewer.id);
  // return String(targetUser.parent || targetUser.invitedBy || "") === reviewerId;
  return false;
}

export function visibleUserFilter(user) {
  if (user.role === ROLES.SUPER_ADMIN) return { deletedAt: null };
  return {
    $and: [
      { deletedAt: null },
      { $or: [{ _id: user._id }, { parent: user._id }, { invitedBy: user._id }] }
    ]
  };
}

export function visibleActivityFilter(user) {
  if (user.role === ROLES.SUPER_ADMIN) return {};
  return { actor: user._id };
}
