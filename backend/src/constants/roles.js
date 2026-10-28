export const ROLES = {
  SUPER_ADMIN: "super_admin",
  AGENT: "agent",
  SUB_AGENT: "sub_agent",
  USER: "user"
};

export const ROLE_VALUES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.AGENT]: "Agent",
  [ROLES.SUB_AGENT]: "Sub Agent",
  [ROLES.USER]: "User"
};

export const INVITE_MATRIX = {
  [ROLES.SUPER_ADMIN]: [ROLES.AGENT, ROLES.SUB_AGENT, ROLES.USER],
  [ROLES.AGENT]: [ROLES.SUB_AGENT, ROLES.USER],
  [ROLES.SUB_AGENT]: [ROLES.USER],
  [ROLES.USER]: []
};

export const PLAN_STATUS = {
  PLATFORM_OWNER: "platform_owner",
  INACTIVE: "inactive",
  ACTIVE: "active",
  CONSUMER: "consumer"
};

export const KYC_STATUS = {
  NOT_REQUIRED: "not_required",
  NOT_STARTED: "not_started",
  PENDING_ADMIN: "pending_admin",
  VERIFIED: "verified",
  REJECTED: "rejected"
};

export const ACCOUNT_STATUS = {
  ACTIVE: "active",
  INVITED: "invited",
  SUSPENDED: "suspended"
};

export const SERVICES = ["PAN", "Aadhaar", "CIBIL"];
