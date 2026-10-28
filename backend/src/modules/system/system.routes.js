import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { alerts, apiPricing, billingSettings, contactEmails, helpContact, saveAlerts, saveApiPricing, saveBillingSettings, saveContactEmails, saveWalletRate, walletRate } from "./system.controller.js";

const router = Router();

router.get("/wallet-rate", requireAuth, walletRate);
router.put("/wallet-rate", requireAuth, saveWalletRate);
router.get("/api-pricing", requireAuth, apiPricing);
router.put("/api-pricing", requireAuth, saveApiPricing);
router.get("/contact-emails", requireAuth, contactEmails);
router.put("/contact-emails", requireAuth, saveContactEmails);
router.get("/billing-settings", requireAuth, billingSettings);
router.put("/billing-settings", requireAuth, saveBillingSettings);
router.get("/alerts", requireAuth, alerts);
router.put("/alerts", requireAuth, saveAlerts);
router.get("/help-contact", requireAuth, helpContact);

export default router;
