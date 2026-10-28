import { PLAN_STATUS, ROLES, SERVICES } from "../../constants/roles.js";
import { canCreatePlans, hasPermission } from "../../utils/permissions.js";
import { forbidden, notFound, unprocessable } from "../../utils/http-error.js";
import { parsePagination } from "../../utils/pagination.js";
import { recordActivity } from "../activity/activity.service.js";
import { getApiPricing } from "../system/system-setting.service.js";
import { User } from "../users/user.model.js";
import { ensureWalletForUser } from "../wallet/wallet.service.js";
import { WalletTransaction } from "../wallet/wallet-transaction.model.js";
import { Plan } from "./plan.model.js";
import { dateSearchClauses, roleSearchValues, searchPattern } from "../../utils/list-search.js";

export async function listPlansForUser(user, query = {}) {
  const pagination = parsePagination(query, { defaultLimit: 50, maxLimit: 200 });
  const filter = await withPlanSearch(visiblePlanFilter(user, query.filter), query.search);
  const plansQuery = Plan.find(filter).populate("audienceUser", "name email role").sort({ createdAt: -1 });

  if (!pagination.enabled) {
    const plans = await plansQuery;
    return withPurchaseCounts(plans);
  }

  const [plans, total] = await Promise.all([
    plansQuery.skip(pagination.skip).limit(pagination.limit),
    Plan.countDocuments(filter)
  ]);

  return {
    items: await withPurchaseCounts(plans),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit))
    }
  };
}

function visiblePlanFilter(user, filter) {
  if (user.role === ROLES.SUPER_ADMIN) {
    return { active: true };
  }

  if (filter === "mine") {
    return { active: true, owner: user._id };
  }

  return {
    active: true,
    $or: [
      { owner: user._id },
      { audienceRole: user.role, audienceUser: null },
      { audienceUser: user._id }
    ]
  };
}

async function withPlanSearch(filter, search) {
  const term = String(search || "").trim();
  if (!term) return filter;

  const pattern = searchPattern(term);
  const matchedRoles = roleSearchValues(term);
  const matchedUsers = await User.find({
    $or: [
      { name: pattern },
      { email: pattern },
      { role: pattern },
      ...(matchedRoles.length > 0 ? [{ role: { $in: matchedRoles } }] : [])
    ]
  }).select("_id");
  const clauses = [
    { name: pattern },
    { ownerRole: pattern },
    { audienceRole: pattern },
    { services: pattern },
    { "serviceRates.service": pattern },
    ...dateSearchClauses("createdAt", term)
  ];

  if (matchedRoles.length > 0) {
    clauses.push({ ownerRole: { $in: matchedRoles } }, { audienceRole: { $in: matchedRoles } });
  }

  if (matchedUsers.length > 0) {
    clauses.push({ audienceUser: { $in: matchedUsers.map((account) => account._id) } });
  }

  return {
    $and: [
      filter,
      { $or: clauses }
    ]
  };
}

export async function createPlan({ user, name, services, serviceRates, audienceRole, audienceUser }) {
  if (!canCreatePlans(user.role) || !hasPermission(user, "plans.create")) {
    throw forbidden("Users cannot create plans");
  }

  const targetUser = await resolveAudienceUser(user, audienceUser);
  const targetRole = targetUser?.role || audienceRole;

  if (!targetUser) {
    throw unprocessable("Choose a specific user for the CIBIL plan");
  }

  if (!canCreatePlanForRole(user.role, targetRole)) {
    throw unprocessable("This role cannot create plans for the selected account type");
  }

  const safeServices = normalizeServices(services);
  const safeServiceRates = normalizeServiceRates(safeServices, serviceRates);
  await assertPlanRateIsAllowed({ user, serviceRates: safeServiceRates });

  const existingPlan = await Plan.findOne({
    owner: user._id,
    audienceUser: targetUser._id,
    active: true
  });

  if (existingPlan) {
    throw unprocessable("A CIBIL plan already exists for this user. Edit the existing plan instead.");
  }

  const plan = await Plan.create({
    owner: user._id,
    ownerRole: user.role,
    audienceRole: targetRole,
    audienceUser: targetUser?._id || null,
    name: normalizePlanName(name, targetUser),
    price: 0,
    credits: 0,
    services: safeServices,
    serviceRates: safeServiceRates,
    active: true
  });

  await assignPlanToUser(targetUser, plan);
  await recordActivity({ user, action: `Assigned CIBIL plan to ${targetUser.name}`, service: "Plans" });
  return toPlanDto(plan);
}

export async function updatePlan({ user, planId, name, services, serviceRates }) {
  const plan = await Plan.findOne({ _id: planId, active: true }).populate("audienceUser", "name email role");
  if (!plan) {
    throw notFound("Plan was not found");
  }

  assertCanManagePlan(user, plan);
  const safeServices = normalizeServices(services ?? plan.services);
  const safeServiceRates = normalizeServiceRates(safeServices, serviceRates ?? plan.serviceRates);
  const ownerForRate =
    String(plan.owner) === String(user._id)
      ? user
      : await User.findById(plan.owner);
  await assertPlanRateIsAllowed({ user: ownerForRate || user, serviceRates: safeServiceRates });

  plan.name = normalizePlanName(name || plan.name, plan.audienceUser);
  plan.price = 0;
  plan.credits = 0;
  plan.services = safeServices;
  plan.serviceRates = safeServiceRates;
  await plan.save();

  if (plan.audienceUser) {
    await assignPlanToUser(plan.audienceUser, plan);
  }

  await recordActivity({ user, action: `Updated ${plan.name}`, service: "Plans" });
  return toPlanDto(plan);
}

export async function deletePlan({ user, planId }) {
  const plan = await Plan.findOne({ _id: planId, active: true });
  if (!plan) {
    throw notFound("Plan was not found");
  }

  assertCanManagePlan(user, plan);
  plan.active = false;
  await plan.save();
  await User.updateMany({ currentPlan: plan._id }, { currentPlan: null, planStatus: PLAN_STATUS.INACTIVE });

  await recordActivity({ user, action: `Deleted ${plan.name}`, service: "Plans" });
  return { ok: true };
}

export async function purchasePlan({ user, planId }) {
  throw unprocessable("Plans are assigned by parent accounts and do not need wallet purchase");
}

export function toPlanDto(plan) {
  const services = normalizeServices(plan.services);
  return {
    id: String(plan._id),
    ownerId: plan.owner?._id ? String(plan.owner._id) : plan.owner ? String(plan.owner) : null,
    ownerRole: plan.ownerRole,
    audienceRole: plan.audienceRole,
    audienceUserId: plan.audienceUser?._id ? String(plan.audienceUser._id) : plan.audienceUser ? String(plan.audienceUser) : null,
    audienceUserName: plan.audienceUser?.name || "",
    audienceUserEmail: plan.audienceUser?.email || "",
    name: plan.name,
    price: plan.price,
    credits: plan.credits,
    services,
    serviceRates: normalizeServiceRates(services, plan.serviceRates),
    purchaseCount: plan.purchaseCount || 0,
    active: plan.active,
    createdAt: plan.createdAt
  };
}

function assertCanManagePlan(user, plan) {
  const ownsPlan = String(plan.owner) === String(user._id);
  if (!hasPermission(user, "plans.create")) {
    throw forbidden("Plan management is not permitted for this account");
  }
  if (user.role !== ROLES.SUPER_ADMIN && !ownsPlan) {
    throw forbidden("You cannot edit this plan");
  }
}

function canCreatePlanForRole(ownerRole, audienceRole) {
  if (ownerRole === ROLES.SUPER_ADMIN) return [ROLES.AGENT, ROLES.SUB_AGENT, ROLES.USER].includes(audienceRole);
  if (ownerRole === ROLES.AGENT) return [ROLES.SUB_AGENT, ROLES.USER].includes(audienceRole);
  if (ownerRole === ROLES.SUB_AGENT) return audienceRole === ROLES.USER;
  return false;
}

async function resolveAudienceUser(user, audienceUser) {
  if (!audienceUser) return null;

  const targetUser = await User.findById(audienceUser);
  if (!targetUser) {
    throw notFound("Selected user was not found");
  }

  if (String(targetUser._id) === String(user._id)) {
    throw unprocessable("Choose another user for a crafted plan");
  }

  if (
    user.role !== ROLES.SUPER_ADMIN &&
    String(targetUser.parent || targetUser.invitedBy || "") !== String(user._id)
  ) {
    throw forbidden("You can create plans only for users directly under your account");
  }

  return targetUser;
}

async function assignPlanToUser(targetUser, plan) {
  targetUser.currentPlan = plan._id;
  targetUser.planStatus = targetUser.role === ROLES.USER ? PLAN_STATUS.CONSUMER : PLAN_STATUS.ACTIVE;
  await targetUser.save();
}

async function assertPlanRateIsAllowed({ user, serviceRates }) {
  const cibilRate = Number(serviceRates.find((rate) => rate.service === "CIBIL")?.cost || 0);
  if (!Number.isFinite(cibilRate) || cibilRate <= 0) {
    throw unprocessable("CIBIL point cost must be greater than zero");
  }

  const minimumRate = await resolveMinimumCibilRateForOwner(user);
  if (cibilRate < minimumRate) {
    throw unprocessable(`CIBIL point cost cannot be below your cost of ${minimumRate} points`);
  }
}

async function resolveMinimumCibilRateForOwner(user) {
  if (user.role === ROLES.SUPER_ADMIN) {
    const pricing = await getApiPricing();
    return Number(pricing.cibil || 0);
  }

  const ownerPlan = user.currentPlan ? await Plan.findById(user.currentPlan) : null;
  const rate = ownerPlan?.serviceRates?.find((item) => item.service === "CIBIL");
  if (!rate) {
    throw forbidden("A CIBIL plan must be assigned to your account before you can create user plans");
  }

  return Number(rate.cost || 0);
}

function normalizePlanName(name, targetUser) {
  const safeName = String(name || "").trim();
  return safeName || `CIBIL Plan - ${targetUser?.name || "User"}`;
}

function normalizeServices(services) {
  const allowed = new Set(SERVICES);
  const requested = Array.isArray(services) ? services : [];
  const safe = [...new Set(requested.filter((service) => allowed.has(service) && service === "CIBIL"))];
  return safe.length > 0 ? safe : ["CIBIL"];
}

function normalizeServiceRates(services, serviceRates) {
  const existingRates = new Map(
    (Array.isArray(serviceRates) ? serviceRates : []).map((rate) => [rate.service, Number(rate.cost)])
  );

  return services.map((service) => ({
    service,
    cost: roundConnectCost(Math.max(0, Number.isFinite(existingRates.get(service)) ? existingRates.get(service) : 0))
  }));
}

function roundConnectCost(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function withPurchaseCounts(plans) {
  const planIds = plans.map((plan) => String(plan._id));
  const counted = await WalletTransaction.aggregate([
    { $match: { source: "plan_purchase", reference: { $in: planIds } } },
    { $group: { _id: "$reference", count: { $sum: 1 } } }
  ]);
  const counts = new Map(counted.map((item) => [item._id, item.count]));

  return plans.map((plan) => ({
    ...toPlanDto(plan),
    purchaseCount: Math.max(plan.purchaseCount || 0, counts.get(String(plan._id)) || 0)
  }));
}
