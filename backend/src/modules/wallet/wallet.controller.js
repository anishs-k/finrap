import { asyncHandler } from "../../utils/async-handler.js";
import { forbidden } from "../../utils/http-error.js";
import { parsePagination } from "../../utils/pagination.js";
import { hasPermission } from "../../utils/permissions.js";
import { sendCreated, sendOk } from "../../utils/response.js";
import {
  createWalletRechargeOrder,
  getWalletInvoiceFile,
  getWalletInvoices,
  getWalletSummary,
  setUserWalletBalanceByAdmin,
  verifyWalletRecharge
} from "./wallet.service.js";

export const walletSummary = asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "wallet.view")) {
    throw forbidden("Wallet access is not permitted for this account");
  }
  sendOk(res, await getWalletSummary(req.user, {
    transactionPagination: parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 }),
    transactionSearch: req.query.search
  }));
});

export const billingInvoices = asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "wallet.view")) {
    throw forbidden("Wallet access is not permitted for this account");
  }
  sendOk(res, await getWalletInvoices(req.user, {
    pagination: parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 }),
    search: req.query.search,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  }));
});

export const billingInvoiceFile = asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "wallet.view")) {
    throw forbidden("Wallet access is not permitted for this account");
  }

  const file = await getWalletInvoiceFile(req.user, {
    invoiceId: req.params.invoiceId,
    action: req.params.action
  });

  const dispositionType = req.params.action === "view" ? "inline" : "attachment";
  res.setHeader("Content-Type", file.contentType || "application/pdf");
  res.setHeader("Content-Disposition", `${dispositionType}; filename="${file.fileName || "wallet-recharge-invoice.pdf"}"`);
  res.send(file.buffer || Buffer.from(""));
});

export const createRechargeOrder = asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "wallet.recharge")) {
    throw forbidden("Wallet recharge is not permitted for this account");
  }
  const order = await createWalletRechargeOrder({
    user: req.user,
    amount: req.body.amount
  });
  sendCreated(res, order);
});

export const updateUserWalletBalance = asyncHandler(async (req, res) => {
  if (req.user.role !== "super_admin") {
    throw forbidden("Only super admin can update wallet balances");
  }
  const wallet = await setUserWalletBalanceByAdmin({
    actor: req.user,
    userId: req.params.userId,
    balance: req.body.balance
  });
  sendOk(res, wallet);
});

export const verifyRecharge = asyncHandler(async (req, res) => {
  const wallet = await verifyWalletRecharge({
    user: req.user,
    orderId: req.body.orderId || req.body.order_id
  });
  sendOk(res, wallet);
});
