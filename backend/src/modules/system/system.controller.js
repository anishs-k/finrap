import { asyncHandler } from "../../utils/async-handler.js";
import { env } from "../../config/env.js";
import { sendOk } from "../../utils/response.js";
import { getAlerts, getApiPricing, getBillingSettingsForAdmin, getContactEmails, getWalletRate, updateAlerts, updateApiPricing, updateBillingSettings, updateContactEmails, updateWalletRate } from "./system-setting.service.js";

export const walletRate = asyncHandler(async (_req, res) => {
  sendOk(res, await getWalletRate());
});

export const saveWalletRate = asyncHandler(async (req, res) => {
  const rate = await updateWalletRate({
    user: req.user,
    rupeesPerConnect: req.body.rupeesPerConnect
  });
  sendOk(res, rate);
});

export const apiPricing = asyncHandler(async (req, res) => {
  sendOk(res, await getApiPricing(req.user, req.query));
});

export const saveApiPricing = asyncHandler(async (req, res) => {
  sendOk(res, await updateApiPricing({ user: req.user, userId: req.body.userId, pricing: req.body.pricing || req.body }));
});

export const helpContact = asyncHandler(async (_req, res) => {
  sendOk(res, { whatsappNumber: env.help.whatsappNumber });
});

export const contactEmails = asyncHandler(async (_req, res) => {
  sendOk(res, await getContactEmails());
});

export const saveContactEmails = asyncHandler(async (req, res) => {
  sendOk(res, await updateContactEmails({
    user: req.user,
    salesEmail: req.body.salesEmail,
    supportEmail: req.body.supportEmail
  }));
});

export const billingSettings = asyncHandler(async (req, res) => {
  sendOk(res, await getBillingSettingsForAdmin(req.user));
});

export const saveBillingSettings = asyncHandler(async (req, res) => {
  sendOk(res, await updateBillingSettings({
    user: req.user,
    settings: req.body
  }));
});

export const alerts = asyncHandler(async (_req, res) => {
  sendOk(res, await getAlerts());
});

export const saveAlerts = asyncHandler(async (req, res) => {
  sendOk(res, await updateAlerts({
    user: req.user,
    alerts: req.body.alerts
  }));
});
