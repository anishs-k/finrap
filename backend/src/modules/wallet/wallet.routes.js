import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { billingInvoiceFile, billingInvoices, createRechargeOrder, updateUserWalletBalance, verifyRecharge, walletSummary } from "./wallet.controller.js";

const router = Router();

router.get("/", requireAuth, walletSummary);
router.get("/invoices", requireAuth, billingInvoices);
router.get("/invoices/:invoiceId/:action", requireAuth, billingInvoiceFile);
router.patch("/users/:userId/balance", requireAuth, updateUserWalletBalance);
router.post("/recharge/order", requireAuth, createRechargeOrder);
router.post("/recharge/verify", requireAuth, verifyRecharge);

export default router;
