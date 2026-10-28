import {
  BILLABLE_PERMISSION_TO_PRICE_KEY,
  DEFAULT_PUBLIC_API_PRICING,
  PANEL_API_PERMISSION_GROUPS
} from "../../constants/permissions.js";
import { ROLES } from "../../constants/roles.js";
import { User } from "./user.model.js";

export async function ensureUpstreamApiAccess({ actor, targetUser, permissions, pricing }) {
  if (!targetUser || targetUser.role === ROLES.SUPER_ADMIN) return [];

  const requestedPermissions = new Set(Array.isArray(permissions) ? permissions : targetUser.permissions || []);
  const permissionsToGrant = new Set();
  const priceKeys = new Set();

  for (const permission of requestedPermissions) {
    const priceKey = BILLABLE_PERMISSION_TO_PRICE_KEY[permission];
    if (priceKey) {
      permissionsToGrant.add(permission);
      priceKeys.add(priceKey);
    }
  }

  for (const group of PANEL_API_PERMISSION_GROUPS) {
    if (requestedPermissions.has(group.generate)) {
      permissionsToGrant.add(group.view);
      permissionsToGrant.add(group.generate);
      priceKeys.add(group.priceKey);
    }
  }

  if (!permissionsToGrant.size && !priceKeys.size) return [];

  const sourcePricing = normalizePricingSnapshot({
    ...(targetUser.apiPricing?.toObject?.() || targetUser.apiPricing || {}),
    ...(pricing || {})
  });
  const changedParents = [];
  const seen = new Set([String(targetUser._id || "")]);
  let parentId = targetUser.parent || targetUser.invitedBy;

  while (parentId) {
    const parent = await User.findById(parentId);
    if (!parent) break;

    const parentKey = String(parent._id);
    if (seen.has(parentKey)) break;
    seen.add(parentKey);

    if (parent.role === ROLES.SUPER_ADMIN) break;

    let changed = false;
    const parentPermissions = new Set(parent.permissions || []);
    for (const permission of permissionsToGrant) {
      if (!parentPermissions.has(permission)) {
        parentPermissions.add(permission);
        changed = true;
      }
    }

    const parentPricing = {
      ...(parent.apiPricing?.toObject?.() || parent.apiPricing || {})
    };
    for (const priceKey of priceKeys) {
      const sourceValue = Number(sourcePricing[priceKey]);
      if (!Number.isFinite(sourceValue) || sourceValue <= 0) continue;

      const parentValue = Number(parentPricing[priceKey]);
      if (!Number.isFinite(parentValue) || parentValue <= 0 || parentValue > sourceValue) {
        parentPricing[priceKey] = sourceValue;
        changed = true;
      }
    }

    if (changed) {
      parent.permissions = Array.from(parentPermissions);
      parent.apiPricing = parentPricing;
      await parent.save();
      changedParents.push(parent);
    }

    if (actor?.role !== ROLES.SUPER_ADMIN && String(actor?._id || "") === parentKey) {
      break;
    }

    parentId = parent.parent || parent.invitedBy;
  }

  return changedParents;
}

function normalizePricingSnapshot(pricing = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_PUBLIC_API_PRICING).map(([key, defaultValue]) => {
      const value = Number(pricing[key]);
      return [key, Number.isFinite(value) && value > 0 ? value : defaultValue];
    })
  );
}
