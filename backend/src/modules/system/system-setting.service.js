import { DEFAULT_PUBLIC_API_PRICING, FINREP_INTERNAL_API_PRICING, PUBLIC_API_PERMISSION_TO_PRICE_KEY } from "../../constants/permissions.js";
import { indianStateNameFromCode, isValidIndianStateCode } from "../../constants/indian-states.js";
import { ACCOUNT_STATUS, ROLES } from "../../constants/roles.js";
import { forbidden, unprocessable } from "../../utils/http-error.js";
import { canInviteRole, visibleUserFilter } from "../../utils/permissions.js";
import { toUserDto } from "../../utils/sanitize.js";
import { recordActivity } from "../activity/activity.service.js";
import { ensureUpstreamApiAccess } from "../users/api-access-inheritance.service.js";
import { User } from "../users/user.model.js";
import { SystemSetting } from "./system-setting.model.js";

const WALLET_RATE_KEY = "wallet_rate_paise_per_connect";
const API_PRICING_KEY = "api_pricing_connects";
const CONTACT_EMAILS_KEY = "contact_emails";
const ALERTS_KEY = "global_alerts";
const BILLING_SETTINGS_KEY = "billing_invoice_settings";
const DEFAULT_RATE_PAISE = 100;
const DEFAULT_CONTACT_EMAILS = {
  salesEmail: "sales@Finrep.in",
  supportEmail: "support@Finrep.in"
};
const DEFAULT_BILLING_SETTINGS = {
  firmName: "",
  firmAddress: "",
  supplierPincode: "",
  supplierStateCode: "",
  supplierState: "",
  supplierGstin: "",
  supplierPan: "",
  supplierPhone: "",
  supplierEmail: "",
  sacCode: "998314"
};
const DEFAULT_API_PRICING = {
  ...FINREP_INTERNAL_API_PRICING,
  aadhaar: 0.5,
  pan: 0.5,
  esign: 0.5,
  econsent: 0.5
};

export async function getWalletRate() {
  const setting = await SystemSetting.findOne({ key: WALLET_RATE_KEY });
  const ratePaise = Number(setting?.value || DEFAULT_RATE_PAISE);
  return {
    ratePaise,
    rupeesPerConnect: Number((ratePaise / 100).toFixed(2))
  };
}

export async function updateWalletRate({ user, rupeesPerConnect }) {
  if (user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only super admin can update wallet tools");
  }

  const rate = Number(rupeesPerConnect);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw unprocessable("Point value must be greater than zero");
  }

  const ratePaise = Math.round(rate * 100);
  const setting = await SystemSetting.findOneAndUpdate(
    { key: WALLET_RATE_KEY },
    { value: ratePaise, updatedBy: user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recordActivity({
    user,
    action: `Updated wallet rate to Rs. ${(ratePaise / 100).toFixed(2)} per point`,
    service: "Tools"
  });

  return {
    ratePaise: Number(setting.value),
    rupeesPerConnect: Number((Number(setting.value) / 100).toFixed(2))
  };
}

export async function getApiPricing(user = null, query = {}) {
  if (query.userId) {
    const targetUser = await findPricingTargetUser(user, query.userId);
    if (!targetUser) {
      throw unprocessable("User was not found");
    }
    return pricingPayloadForUser(targetUser);
  }

  if (user && user.role !== ROLES.SUPER_ADMIN) {
    return pricingPayloadForUser(user);
  }

  const setting = await SystemSetting.findOne({ key: API_PRICING_KEY });
  return { pricing: { ...DEFAULT_API_PRICING, ...(setting?.value || {}) }, user: null, permissions: [] };
}

export async function updateApiPricing({ user, userId, pricing }) {
  if (user.role === ROLES.USER) {
    throw forbidden("You are not allowed to update API pricing");
  }

  const targetUser = await findPricingTargetUser(user, userId, { activeOnly: true });
  if (!targetUser) {
    throw unprocessable("Choose an active user");
  }

  if (String(targetUser._id) === String(user._id)) {
    throw unprocessable("Choose a downstream user to update pricing");
  }

  if (targetUser.role === ROLES.SUPER_ADMIN) {
    throw forbidden("Super admin API pricing cannot be changed here");
  }

  if (user.role !== ROLES.SUPER_ADMIN && !canInviteRole(user.role, targetUser.role)) {
    throw forbidden("You cannot update pricing for this account");
  }

  const nextPricing = normalizeApiPricing(pricing);

  for (const value of Object.values(nextPricing)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw unprocessable("API pricing must be greater than zero");
    }
  }

  targetUser.apiPricing = nextPricing;
  await targetUser.save();
  await ensureUpstreamApiAccess({
    actor: user,
    targetUser,
    permissions: targetUser.permissions,
    pricing: nextPricing
  });

  await recordActivity({
    user,
    action: `Updated API pricing for ${targetUser.name}`,
    service: "Tools"
  });

  return pricingPayloadForUser(targetUser);
}

async function findPricingTargetUser(user, userId, options = {}) {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) return null;

  const accountFilter = { _id: cleanUserId };
  if (options.activeOnly) {
    accountFilter.status = { $ne: ACCOUNT_STATUS.SUSPENDED };
  }

  const filter = user?.role === ROLES.SUPER_ADMIN
    ? accountFilter
    : { $and: [visibleUserFilter(user), accountFilter] };

  return User.findOne(filter).populate("invitedBy", "name email role");
}

export function normalizeApiPricing(pricing = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_PUBLIC_API_PRICING).map(([key, defaultValue]) => {
      const value = Number(pricing?.[key]);
      return [key, Number.isFinite(value) && value > 0 ? value : defaultValue];
    })
  );
}

export function pricingPayloadForUser(user) {
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return {
    user: toUserDto(user, null, { includePublicApiToken: true }),
    permissions,
    pricing: normalizeApiPricing(user.apiPricing)
  };
}

export function priceKeyForPermission(permission) {
  return PUBLIC_API_PERMISSION_TO_PRICE_KEY[permission] || "";
}

export async function getContactEmails() {
  const setting = await SystemSetting.findOne({ key: CONTACT_EMAILS_KEY });
  return { ...DEFAULT_CONTACT_EMAILS, ...(setting?.value || {}) };
}

export async function updateContactEmails({ user, salesEmail, supportEmail }) {
  if (user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only super admin can update contact emails");
  }

  const nextSalesEmail = String(salesEmail || "").toLowerCase().trim();
  const nextSupportEmail = String(supportEmail || "").toLowerCase().trim();
  if (!isEmail(nextSalesEmail) || !isEmail(nextSupportEmail)) {
    throw unprocessable("Enter valid contact email addresses");
  }

  const setting = await SystemSetting.findOneAndUpdate(
    { key: CONTACT_EMAILS_KEY },
    { value: { salesEmail: nextSalesEmail, supportEmail: nextSupportEmail }, updatedBy: user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recordActivity({
    user,
    action: "Updated contact emails",
    service: "Contact"
  });

  return { ...DEFAULT_CONTACT_EMAILS, ...(setting.value || {}) };
}

export async function getBillingSettingsForAdmin(user) {
  if (user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only super admin can view billing settings");
  }

  return getBillingSettings();
}

export async function getBillingSettings() {
  const setting = await SystemSetting.findOne({ key: BILLING_SETTINGS_KEY });
  return normalizeBillingSettings(setting?.value || {});
}

export async function updateBillingSettings({ user, settings }) {
  if (user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only super admin can update billing settings");
  }

  const nextSettings = normalizeBillingSettings(settings || {});
  validateBillingSettings(nextSettings);
  const setting = await SystemSetting.findOneAndUpdate(
    { key: BILLING_SETTINGS_KEY },
    { value: nextSettings, updatedBy: user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recordActivity({
    user,
    action: "Updated billing invoice settings",
    service: "Billing"
  });

  return normalizeBillingSettings(setting.value || {});
}

export async function getAlerts() {
  const setting = await SystemSetting.findOne({ key: ALERTS_KEY });
  return normalizeAlerts(setting?.value || []);
}

export async function updateAlerts({ user, alerts }) {
  if (user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only super admin can update alerts");
  }

  const nextAlerts = normalizeAlerts(alerts);
  const setting = await SystemSetting.findOneAndUpdate(
    { key: ALERTS_KEY },
    { value: nextAlerts, updatedBy: user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recordActivity({
    user,
    action: "Updated global alerts",
    service: "Alerts"
  });

  return normalizeAlerts(setting.value || []);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeBillingSettings(settings = {}) {
  const supplierStateCode = String(settings.supplierStateCode || settings.stateCode || "").trim().toUpperCase();
  const supplierState = indianStateNameFromCode(supplierStateCode) || indianStateNameFromCode(settings.supplierState) || "";
  return {
    ...DEFAULT_BILLING_SETTINGS,
    firmName: String(settings.firmName || "").trim(),
    firmAddress: String(settings.firmAddress || "").trim(),
    supplierPincode: String(settings.supplierPincode || "").replace(/\D/g, "").slice(0, 6),
    supplierStateCode,
    supplierState,
    supplierGstin: String(settings.supplierGstin || "").trim().toUpperCase(),
    supplierPan: String(settings.supplierPan || "").trim().toUpperCase(),
    supplierPhone: normalizeSupplierPhone(settings.supplierPhone),
    supplierEmail: String(settings.supplierEmail || "").trim().toLowerCase(),
    sacCode: String(settings.sacCode || DEFAULT_BILLING_SETTINGS.sacCode).replace(/\D/g, "").slice(0, 6)
  };
}

function validateBillingSettings(settings) {
  const requiredFields = [
    ["Firm name", settings.firmName],
    ["Firm address", settings.firmAddress],
    ["Supplier pincode", settings.supplierPincode],
    ["Supplier state", settings.supplierStateCode],
    ["Supplier GSTIN", settings.supplierGstin],
    ["Supplier PAN", settings.supplierPan],
    ["Supplier phone", settings.supplierPhone],
    ["Supplier email", settings.supplierEmail],
    ["SAC code", settings.sacCode]
  ];
  const missing = requiredFields.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
  if (missing.length > 0) {
    throw unprocessable(`${missing.join(", ")} required`);
  }
  if (!isValidIndianStateCode(settings.supplierStateCode)) {
    throw unprocessable("Choose a valid supplier state");
  }
  if (!/^\d{6}$/.test(settings.supplierPincode)) {
    throw unprocessable("Supplier pincode must be a valid 6 digit pincode");
  }
  if (!isValidSupplierPhone(settings.supplierPhone)) {
    throw unprocessable("Supplier phone must be a valid Indian mobile number");
  }
  if (!isEmail(settings.supplierEmail)) {
    throw unprocessable("Enter a valid supplier email");
  }
  if (!/^\d{6}$/.test(settings.sacCode)) {
    throw unprocessable("SAC code must be a valid 6 digit code");
  }
}

function normalizeSupplierPhone(value) {
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

function isValidSupplierPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return /^[6-9]\d{9}$/.test(digits);
}

function normalizeAlerts(alerts = []) {
  const now = new Date().toISOString();
  return (Array.isArray(alerts) ? alerts : [])
    .map((alert, index) => ({
      id: String(alert?.id || `${Date.now()}-${index}`),
      message: String(alert?.message || "").trim(),
      active: alert?.active !== false,
      createdAt: alert?.createdAt || now,
      updatedAt: now
    }))
    .filter((alert) => alert.message);
}
