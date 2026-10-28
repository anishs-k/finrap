import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { ROLE_DEFAULT_PERMISSIONS } from "../constants/permissions.js";
import { ACCOUNT_STATUS, KYC_STATUS, PLAN_STATUS, ROLES } from "../constants/roles.js";
import { User } from "../modules/users/user.model.js";
import { recordActivity } from "../modules/activity/activity.service.js";

export async function ensureSuperAdmin() {
  const passwordHash = await bcrypt.hash(env.superAdmin.password, 12);
  const existing = await User.findOne({ email: env.superAdmin.email }).select("+passwordHash");

  if (existing) {
    existing.name = env.superAdmin.name;
    existing.passwordHash = passwordHash;
    existing.role = ROLES.SUPER_ADMIN;
    existing.status = ACCOUNT_STATUS.ACTIVE;
    existing.planStatus = PLAN_STATUS.PLATFORM_OWNER;
    existing.kycStatus = KYC_STATUS.NOT_REQUIRED;
    existing.permissions = ROLE_DEFAULT_PERMISSIONS[ROLES.SUPER_ADMIN];
    existing.parent = null;
    existing.invitedBy = null;
    await existing.save();
    return existing;
  }

  const user = await User.create({
    name: env.superAdmin.name,
    email: env.superAdmin.email,
    passwordHash,
    role: ROLES.SUPER_ADMIN,
    status: ACCOUNT_STATUS.ACTIVE,
    planStatus: PLAN_STATUS.PLATFORM_OWNER,
    kycStatus: KYC_STATUS.NOT_REQUIRED,
    permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.SUPER_ADMIN]
  });

  await recordActivity({
    user,
    action: "Seeded platform super admin",
    service: "System"
  });

  return user;
}

async function runSeed() {
  await connectDatabase();
  const user = await ensureSuperAdmin();
  console.log(`Super admin ready: ${user.email}`);
  await disconnectDatabase();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed().catch(async (error) => {
    console.error("Failed to seed super admin", error);
    await disconnectDatabase();
    process.exit(1);
  });
}
