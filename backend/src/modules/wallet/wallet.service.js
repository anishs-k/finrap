import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { ROLES } from "../../constants/roles.js";
import { notFound, unprocessable } from "../../utils/http-error.js";
import { recordActivity } from "../activity/activity.service.js";
import { amountPaiseSearchClauses, dateSearchClauses, roleSearchValues, searchPattern, unitSearchClauses } from "../../utils/list-search.js";
import { getWalletRate } from "../system/system-setting.service.js";
import { User } from "../users/user.model.js";
import { fetchWalletRechargeInvoiceFile, generateWalletRechargeInvoice } from "./billing-invoice.service.js";
import { createCashfreeOrder, getCashfreeOrder } from "./cashfree.service.js";
import { Wallet } from "./wallet.model.js";
import { WalletRecharge } from "./wallet-recharge.model.js";
import { WalletTransaction } from "./wallet-transaction.model.js";
import { amountPaiseToConnectUnits, paiseToRupees, rupeesToPaise, unitsToConnects } from "./wallet.utils.js";

const MIN_RECHARGE_PAISE = 100;
const MAX_RECHARGE_PAISE = 50000000;
const RECHARGE_GST_PERCENT = 18;
const MIN_RECHARGE_PAISE_BY_ROLE = {
  agent: 2500000,
  sub_agent: 1500000,
  user: 1000000
};

function walletBrandForUser(user) {
  const email = String(user?.email || "").toLowerCase();
  const whiteLabelApiDomain = String(user?.whiteLabelApiDomain || "").toLowerCase();
  if (email === "rahul@fandc.in" || whiteLabelApiDomain.includes("fandc.in")) {
    return "FNC";
  }
  return "Finrep";
}

export async function ensureWalletForUser(user, { session = null } = {}) {
  const userId = resolveUserId(user);
  if (!userId) {
    throw notFound("Account was not found");
  }

  try {
    return await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $setOnInsert: {
          user: userId,
          balanceUnits: legacyWalletBalanceUnits(user)
        }
      },
      withSessionOptions(
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        },
        session
      )
    );
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const query = Wallet.findOne({ user: userId });
    if (session) query.session(session);
    return query;
  }
}

export async function ensureWalletsForUsers(users) {
  const safeUsers = users || [];
  const userIds = safeUsers.map(resolveUserId).filter(Boolean);
  if (userIds.length === 0) {
    return new Map();
  }

  const existingWallets = await Wallet.find({ user: { $in: userIds } });
  const walletsByUser = new Map(existingWallets.map((wallet) => [String(wallet.user), wallet]));
  const missingUsers = safeUsers.filter((user) => !walletsByUser.has(String(resolveUserId(user))));

  if (missingUsers.length > 0) {
    const createdWallets = await Promise.all(missingUsers.map((user) => ensureWalletForUser(user)));
    createdWallets.forEach((wallet) => walletsByUser.set(String(wallet.user), wallet));
  }

  return walletsByUser;
}

export async function getWalletSummary(user, { transactionPagination = null, transactionSearch = "" } = {}) {
  const transactionFilter = await buildWalletTransactionFilter(user, transactionSearch);
  const transactionQuery = WalletTransaction.find(transactionFilter).populate("user", "name email role").sort({ createdAt: -1 });
  const limitedTransactionQuery = transactionPagination?.enabled
    ? transactionQuery.skip(transactionPagination.skip).limit(transactionPagination.limit)
    : transactionQuery.limit(50);
  const [wallet, rate, transactions, transactionTotal, userBalances] = await Promise.all([
    ensureWalletForUser(user),
    getWalletRate(),
    limitedTransactionQuery,
    transactionPagination?.enabled ? WalletTransaction.countDocuments(transactionFilter) : Promise.resolve(null),
    user.role !== ROLES.USER ? getVisibleUserWalletBalances(user) : Promise.resolve([])
  ]);

  const summary = {
    walletKey: wallet.walletKey,
    balance: unitsToConnects(wallet.balanceUnits || 0),
    balanceUnits: wallet.balanceUnits || 0,
    rate,
    transactions: transactions.map(toTransactionDto),
    userBalances
  };

  if (transactionPagination?.enabled) {
    summary.transactionsPagination = {
      page: transactionPagination.page,
      limit: transactionPagination.limit,
      total: transactionTotal,
      totalPages: Math.max(1, Math.ceil(transactionTotal / transactionPagination.limit))
    };
  }

  return summary;
}

async function getVisibleUserWalletBalances(user) {
  const visibleUserIds = await resolveWalletVisibleUserIds(user);
  const filter = Array.isArray(visibleUserIds)
    ? { _id: { $in: visibleUserIds.filter((id) => String(id) !== String(user._id)) }, deletedAt: null }
    : { deletedAt: null };
  const users = await User.find(filter)
    .select("name email role status walletBalanceUnits")
    .sort({ role: 1, name: 1, email: 1 });
  const walletsByUser = await ensureWalletsForUsers(users);

  return users.map((account) => {
    const wallet = walletsByUser.get(String(account._id));
    const balanceUnits = Number(wallet?.balanceUnits ?? account.walletBalanceUnits ?? 0);
    return {
      id: String(account._id),
      name: account.name,
      email: account.email,
      role: account.role,
      status: account.status,
      balance: unitsToConnects(balanceUnits),
      balanceUnits
    };
  });
}

export async function getWalletInvoices(user, { pagination = null, dateFrom = "", dateTo = "", search = "" } = {}) {
  const filter = buildWalletInvoiceFilter(user, { dateFrom, dateTo });
  const query = WalletRecharge.find(filter).populate("user", "name email role").sort({ paidAt: -1, createdAt: -1 });

  const searchTerm = String(search || "").trim().toLowerCase();
  if (searchTerm) {
    const invoices = await query;
    const filteredInvoices = invoices
      .map(toInvoiceDto)
      .filter((invoice) => invoiceMatchesSearch(invoice, searchTerm));
    const paginatedItems = pagination?.enabled
      ? filteredInvoices.slice(pagination.skip, pagination.skip + pagination.limit)
      : filteredInvoices.slice(0, 50);
    const payload = {
      items: paginatedItems
    };
    if (pagination?.enabled) {
      payload.pagination = {
        page: pagination.page,
        limit: pagination.limit,
        total: filteredInvoices.length,
        totalPages: Math.max(1, Math.ceil(filteredInvoices.length / pagination.limit))
      };
    }
    return payload;
  }

  const limitedQuery = pagination?.enabled ? query.skip(pagination.skip).limit(pagination.limit) : query.limit(50);
  const [invoices, total] = await Promise.all([
    limitedQuery,
    pagination?.enabled ? WalletRecharge.countDocuments(filter) : Promise.resolve(null)
  ]);

  const payload = {
    items: invoices.map(toInvoiceDto)
  };

  if (pagination?.enabled) {
    payload.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit))
    };
  }

  return payload;
}

export async function getWalletInvoiceFile(user, { invoiceId, action = "download" } = {}) {
  const cleanInvoiceId = String(invoiceId || "").trim();
  if (!cleanInvoiceId) {
    throw unprocessable("Invoice ID is required");
  }

  const filter = {
    status: "paid",
    billingInvoiceId: cleanInvoiceId,
    ...(user.role === ROLES.SUPER_ADMIN ? {} : { user: user._id })
  };
  const recharge = await WalletRecharge.findOne(filter).populate("user", "name email role avatarUrl roadStreet state stateCode pincode gstin pan contact");
  if (!recharge) {
    throw notFound("Invoice was not found");
  }

  const storedFile = storedInvoiceFile(recharge);
  if (storedFile) {
    return storedFile;
  }

  const sourceUrl = action === "view"
    ? recharge.billingInvoiceViewUrl
    : recharge.billingInvoiceDownloadUrl;

  try {
    const file = await fetchWalletRechargeInvoiceFile({
      invoiceId: recharge.billingInvoiceId,
      action,
      sourceUrl
    });
    await storeInvoiceFile(recharge._id, file);
    return file;
  } catch (error) {
    if (!isRecoverableBillingInvoiceError(error)) {
      throw error;
    }

    const invoice = await recreateWalletRechargeInvoice(recharge);
    const file = await fetchWalletRechargeInvoiceFile({
      invoiceId: invoice.invoiceId,
      action,
      sourceUrl: action === "view" ? invoice.invoiceViewUrl : invoice.invoiceDownloadUrl
    });
    await storeInvoiceFile(recharge._id, file);
    return file;
  }
}

async function recreateWalletRechargeInvoice(recharge) {
  const oldInvoiceId = recharge.billingInvoiceId || "";
  const invoice = await generateWalletRechargeInvoice({
    user: recharge.user,
    recharge
  });

  const invoiceFile = await tryFetchInvoiceFile({
    invoiceId: invoice.invoiceId,
    action: "download",
    sourceUrl: invoice.invoiceDownloadUrl
  });
  const invoiceFields = {
    billingInvoiceStatus: "created",
    billingInvoiceId: invoice.invoiceId,
    billingInvoiceViewUrl: invoice.invoiceViewUrl,
    billingInvoiceDownloadUrl: invoice.invoiceDownloadUrl,
    billingInvoiceError: "",
    ...invoiceFileFields(invoiceFile)
  };

  await WalletRecharge.updateOne({ _id: recharge._id }, invoiceFields);
  await WalletTransaction.updateMany(
    {
      user: recharge.user?._id || recharge.user,
      ...(oldInvoiceId ? { invoiceId: oldInvoiceId } : {})
    },
    {
      invoiceId: invoice.invoiceId,
      invoiceViewUrl: invoice.invoiceViewUrl,
      invoiceDownloadUrl: invoice.invoiceDownloadUrl
    }
  );

  return invoice;
}

function storedInvoiceFile(recharge) {
  const buffer = recharge.billingInvoicePdf;
  if (!buffer?.length) return null;

  return {
    fileName: recharge.billingInvoiceFileName || `wallet-recharge-invoice-${recharge.billingInvoiceId}.pdf`,
    contentType: recharge.billingInvoiceContentType || "application/pdf",
    buffer
  };
}

async function storeInvoiceFile(rechargeId, file) {
  const fields = invoiceFileFields(file);
  if (!fields.billingInvoicePdf) return;
  await WalletRecharge.updateOne({ _id: rechargeId }, fields);
}

function invoiceFileFields(file) {
  if (!file?.buffer?.length) return {};
  return {
    billingInvoiceFileName: file.fileName || "wallet-recharge-invoice.pdf",
    billingInvoiceContentType: file.contentType || "application/pdf",
    billingInvoicePdf: file.buffer,
    billingInvoiceStoredAt: new Date()
  };
}

async function tryFetchInvoiceFile(options) {
  try {
    return await fetchWalletRechargeInvoiceFile(options);
  } catch {
    return null;
  }
}

function isRecoverableBillingInvoiceError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("invoice not found") || message.includes("route not found");
}

function invoiceMatchesSearch(invoice, searchTerm) {
  const paidAt = invoice.paidAt || invoice.createdAt;
  const date = paidAt ? new Date(paidAt) : null;
  const dateValues = date && !Number.isNaN(date.getTime())
    ? [
        date.toISOString(),
        date.toDateString(),
        date.toLocaleDateString("en-IN"),
        date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      ]
    : [];

  const values = [
    "wallet recharge",
    "recharge",
    "invoice",
    invoice.userName,
    invoice.userEmail,
    invoice.userRole,
    invoice.status,
    ...dateValues,
    ...invoiceAmountSearchValues(invoice.amount),
    ...invoiceAmountSearchValues(invoice.gstAmount),
    ...invoiceAmountSearchValues(invoice.walletCreditAmount)
  ];

  return values.some((value) => String(value || "").toLowerCase().includes(searchTerm));
}

function invoiceAmountSearchValues(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return [];
  return [
    numeric,
    numeric.toFixed(2),
    `rs ${numeric}`,
    `rs. ${numeric}`,
    `rs ${numeric.toFixed(2)}`,
    `rs. ${numeric.toFixed(2)}`,
    `₹${numeric}`,
    `₹${numeric.toFixed(2)}`
  ];
}

function buildWalletInvoiceFilter(user, { dateFrom = "", dateTo = "" } = {}) {
  const filter = {
    status: "paid",
    billingInvoiceId: { $ne: "" },
    billingInvoiceViewUrl: { $ne: "" },
    ...(user.role === ROLES.SUPER_ADMIN ? {} : { user: user._id })
  };
  const paidAt = {};
  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(from.getTime())) paidAt.$gte = from;
  }
  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999Z`);
    if (!Number.isNaN(to.getTime())) paidAt.$lte = to;
  }
  if (Object.keys(paidAt).length > 0) filter.paidAt = paidAt;
  return filter;
}

async function buildWalletTransactionFilter(user, search) {
  const visibleUserIds = await resolveWalletVisibleUserIds(user);
  const baseFilter = Array.isArray(visibleUserIds) ? { user: { $in: visibleUserIds } } : {};
  const term = String(search || "").trim();
  if (!term) return baseFilter;

  const pattern = searchPattern(term);
  const matchedRoles = roleSearchValues(term);
  const searchClauses = [
    { type: pattern },
    { source: pattern },
    { reference: pattern },
    { description: pattern },
    ...dateSearchClauses("createdAt", term),
    ...amountPaiseSearchClauses(["amountPaise"], term),
    ...unitSearchClauses(["connectsDeltaUnits", "balanceAfterUnits"], term)
  ];

  const matchedUsers = await User.find({
    ...(Array.isArray(visibleUserIds) ? { _id: { $in: visibleUserIds } } : {}),
    $or: [
      { name: pattern },
      { email: pattern },
      { role: pattern },
      ...(matchedRoles.length > 0 ? [{ role: { $in: matchedRoles } }] : [])
    ]
  }).select("_id");
  if (matchedUsers.length > 0) {
    searchClauses.push({ user: { $in: matchedUsers.map((account) => account._id) } });
  }

  return {
    $and: [
      baseFilter,
      { $or: searchClauses }
    ]
  };
}

async function resolveWalletVisibleUserIds(user) {
  if (user.role === ROLES.SUPER_ADMIN) return null;
  if (user.role === ROLES.USER) return [user._id];

  const seen = new Set([String(user._id)]);
  let frontier = [user._id];

  while (frontier.length > 0) {
    const children = await User.find({
      $or: [
        { parent: { $in: frontier } },
        { invitedBy: { $in: frontier } }
      ]
    }).select("_id");

    frontier = children
      .map((child) => String(child._id))
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }

  return Array.from(seen).map((id) => new mongoose.Types.ObjectId(id));
}

export async function createWalletRechargeOrder({ user, amount }) {
  const amountPaise = rupeesToPaise(amount);
  if (!Number.isInteger(amountPaise) || amountPaise < MIN_RECHARGE_PAISE) {
    throw unprocessable("Recharge amount must be at least Rs. 1");
  }
  const roleMinimumPaise = minimumRechargePaiseForRole(user?.role);
  if (amountPaise < roleMinimumPaise) {
    throw unprocessable(`Minimum recharge amount for ${roleRechargeLabel(user?.role)} is Rs. ${formatPaiseForMessage(roleMinimumPaise)}`);
  }
  if (amountPaise > MAX_RECHARGE_PAISE) {
    throw unprocessable("Recharge amount cannot exceed Rs. 5,00,000");
  }

  const rate = await getWalletRate();
  const walletCreditAmountPaise = amountPaise;
  const gstAmountPaise = rechargeGstPaise(amountPaise);
  const payableAmountPaise = amountPaise;
  const roundingAdjustmentPaise = 0;
  const connectsUnits = amountPaiseToConnectUnits(walletCreditAmountPaise, rate.ratePaise);
  if (connectsUnits <= 0) {
    throw unprocessable("Recharge amount is too low for the current point value");
  }

  const orderId = `wallet_${String(user._id).slice(-8)}_${Date.now()}`;
  const amountRupees = paiseToRupees(amountPaise);
  const payableAmountRupees = paiseToRupees(payableAmountPaise);
  const order = await createCashfreeOrder({
    orderId,
    amount: payableAmountRupees,
    user,
    returnUrl: `${env.appUrl}/?view=wallet&cashfree_order_id=${orderId}`
  });

  await WalletRecharge.create({
    user: user._id,
    amountPaise,
    payableAmountPaise,
    gstRate: RECHARGE_GST_PERCENT,
    gstAmountPaise,
    walletCreditAmountPaise,
    roundingAdjustmentPaise,
    ratePaisePerConnect: rate.ratePaise,
    connectsUnits,
    paymentProvider: "cashfree",
    providerOrderId: order.order_id || orderId
  });

  return {
    orderId: order.order_id || orderId,
    paymentSessionId: order.payment_session_id,
    amountPaise,
    amount: amountRupees,
    payableAmountPaise,
    payableAmount: payableAmountRupees,
    gstRate: RECHARGE_GST_PERCENT,
    gstAmountPaise,
    gstAmount: paiseToRupees(gstAmountPaise),
    walletCreditAmountPaise,
    walletCreditAmount: paiseToRupees(walletCreditAmountPaise),
    roundingAdjustmentPaise,
    roundingAdjustment: paiseToRupees(roundingAdjustmentPaise),
    currency: env.cashfree.currency,
    connects: unitsToConnects(connectsUnits),
    name: "Finrep Wallet",
    description: `${unitsToConnects(connectsUnits)} points recharge`,
    provider: "cashfree",
    mode: String(env.cashfree.environment || "").toLowerCase() === "sandbox" ? "sandbox" : "production"
  };
}

function rechargeGstPaise(amountPaise) {
  return Math.ceil((amountPaise * RECHARGE_GST_PERCENT) / 100);
}

function rechargePayablePaise(amountPaise, gstAmountPaise) {
  return Math.ceil((amountPaise + gstAmountPaise) / 100) * 100;
}

function minimumRechargePaiseForRole(role) {
  return MIN_RECHARGE_PAISE_BY_ROLE[role] || MIN_RECHARGE_PAISE;
}

function roleRechargeLabel(role) {
  if (role === "agent") return "Agent";
  if (role === "sub_agent") return "Sub Agent";
  if (role === "user") return "User";
  return "this account";
}

function formatPaiseForMessage(paise) {
  return paiseToRupees(paise).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  });
}

export async function verifyWalletRecharge({ user, orderId }) {
  if (!orderId) {
    throw unprocessable("Payment verification details are required");
  }

  const cashfreeOrder = await getCashfreeOrder(orderId);
  if (String(cashfreeOrder.order_status || "").toUpperCase() !== "PAID") {
    await WalletRecharge.findOneAndUpdate(
      { providerOrderId: orderId, user: user._id },
      { failureReason: `Cashfree status: ${cashfreeOrder.order_status || "UNKNOWN"}` }
    );
    throw unprocessable("Payment is not completed yet");
  }

  const result = await creditVerifiedRecharge({
    user,
    providerOrderId: orderId,
    providerPaymentId: String(cashfreeOrder.cf_order_id || orderId)
  });
  if (result.alreadyPaid) {
    return getWalletSummary(user);
  }

  await recordActivity({
    user: result.updatedUser,
    action: `${result.updatedUser.name} recharged wallet with Rs. ${unitsToConnects(result.creditedConnectsUnits)} through Cashfree`,
    service: "Cashfree",
    notifySuperAdmins: result.updatedUser.role !== ROLES.SUPER_ADMIN
  });

  return getWalletSummary(result.updatedUser);
}

export async function setUserWalletBalanceByAdmin({ actor, userId, balance }) {
  if (!userId) {
    throw notFound("Account was not found");
  }

  const parsedBalance = Number(balance);
  if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
    throw unprocessable("Wallet balance must be a valid non-negative amount");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw notFound("Account was not found");
  }
  if (targetUser.role === ROLES.SUPER_ADMIN) {
    throw unprocessable("Super admin wallet balance cannot be updated here");
  }

  const targetUnits = Math.round(parsedBalance * 100);
  const wallet = await ensureWalletForUser(targetUser);
  const previousUnits = Number(wallet.balanceUnits || 0);
  const deltaUnits = targetUnits - previousUnits;

  wallet.balanceUnits = targetUnits;
  await wallet.save();
  await syncUserWalletBalance(targetUser._id, targetUnits);

  if (deltaUnits !== 0) {
    await WalletTransaction.create({
      user: targetUser._id,
      type: deltaUnits > 0 ? "credit" : "debit",
      source: "system",
      amountPaise: Math.abs(deltaUnits),
      connectsDeltaUnits: deltaUnits,
      balanceAfterUnits: targetUnits,
      reference: `wallet-balance-update:${targetUser._id}:${Date.now()}`,
      description: `Wallet balance updated by ${actor?.name || actor?.email || "Super Admin"}`
    });
  }

  return getWalletSummary(actor, {
    transactionPagination: { enabled: true, page: 1, limit: 10, skip: 0 }
  });
}

async function creditVerifiedRecharge({ user, providerOrderId, providerPaymentId }) {
  const session = await mongoose.startSession();

  try {
    let result = null;
    await session.withTransaction(async () => {
      result = await applyRechargeCredit({ user, providerOrderId, providerPaymentId, session });
    });
    return result;
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      throw error;
    }

    return applyRechargeCredit({ user, providerOrderId, providerPaymentId });
  } finally {
    await session.endSession();
  }
}

async function applyRechargeCredit({ user, providerOrderId, providerPaymentId, session = null }) {
  const recharge = await WalletRecharge.findOneAndUpdate(
    { providerOrderId, user: user._id, status: "created" },
    { status: "processing", providerPaymentId, failureReason: "" },
    withSessionOptions({ new: true }, session)
  );

  if (!recharge) {
    const query = WalletRecharge.findOne({ providerOrderId, user: user._id });
    const existing = session ? await query.session(session) : await query;
    if (existing?.status === "paid") {
      return { alreadyPaid: true };
    }
    if (existing?.status === "processing") {
      throw unprocessable("Payment verification is already processing");
    }
    throw notFound("Recharge order was not found");
  }

  await ensureWalletForUser(user, { session });
  const updatedWallet = await Wallet.findOneAndUpdate(
    { user: user._id },
    { $inc: { balanceUnits: recharge.connectsUnits } },
    withSessionOptions({ new: true }, session)
  );

  if (!updatedWallet) {
    throw notFound("Wallet was not found");
  }

  const updatedUser = await syncUserWalletBalance(user._id, updatedWallet.balanceUnits, session);
  if (!updatedUser) {
    throw notFound("Account was not found");
  }

  const transaction = {
    user: user._id,
    type: "credit",
    source: "cashfree",
    amountPaise: recharge.amountPaise,
    connectsDeltaUnits: recharge.connectsUnits,
    balanceAfterUnits: updatedWallet.balanceUnits,
    reference: providerPaymentId,
    description: "Wallet recharge"
  };

  if (session) {
    await WalletTransaction.create([transaction], { session });
  } else {
    await WalletTransaction.create(transaction);
  }

  recharge.status = "paid";
  recharge.paidAt = new Date();
  await recharge.save(withSessionOptions({}, session));

  return {
    updatedUser,
    creditedConnectsUnits: recharge.connectsUnits,
    rechargeId: recharge._id,
    providerOrderId,
    providerPaymentId,
    alreadyPaid: false
  };
}

async function createInvoiceForPaidRecharge(result) {
  if (!result?.rechargeId || result.alreadyPaid) return null;

  const recharge = await WalletRecharge.findById(result.rechargeId);
  if (!recharge || recharge.billingInvoiceStatus === "created") return recharge ? toInvoiceDto(recharge) : null;

  try {
    await WalletRecharge.updateOne(
      { _id: recharge._id },
      { billingInvoiceStatus: "processing", billingInvoiceError: "" }
    );

    const invoice = await generateWalletRechargeInvoice({
      user: result.updatedUser,
      recharge
    });

    const invoiceFields = {
      billingInvoiceStatus: "created",
      billingInvoiceId: invoice.invoiceId,
      billingInvoiceViewUrl: invoice.invoiceViewUrl,
      billingInvoiceDownloadUrl: invoice.invoiceDownloadUrl,
      billingInvoiceError: ""
    };
    const invoiceFile = await tryFetchInvoiceFile({
      invoiceId: invoice.invoiceId,
      action: "download",
      sourceUrl: invoice.invoiceDownloadUrl
    });
    Object.assign(invoiceFields, invoiceFileFields(invoiceFile));
    await WalletRecharge.updateOne({ _id: recharge._id }, invoiceFields);
    await WalletTransaction.findOneAndUpdate(
      {
        user: result.updatedUser._id,
        source: "cashfree",
        reference: result.providerPaymentId
      },
      {
        invoiceId: invoice.invoiceId,
        invoiceViewUrl: invoice.invoiceViewUrl,
        invoiceDownloadUrl: invoice.invoiceDownloadUrl
      },
      { sort: { createdAt: -1 } }
    );
    return toInvoiceDto({
      ...recharge.toObject(),
      ...invoiceFields,
      user: result.updatedUser,
      paidAt: recharge.paidAt || new Date()
    });
  } catch (error) {
    await WalletRecharge.updateOne(
      { _id: recharge._id },
      {
        billingInvoiceStatus: "failed",
        billingInvoiceError: error instanceof Error ? error.message : "Billing invoice generation failed"
      }
    );
    return null;
  }
}

export async function debitWalletForPlan({ user, plan, connectsUnits, session = null }) {
  await ensureWalletForUser(user, { session });
  const updatedWallet = await Wallet.findOneAndUpdate(
    { user: user._id, balanceUnits: { $gte: connectsUnits } },
    { $inc: { balanceUnits: -connectsUnits } },
    withSessionOptions({ new: true }, session)
  );

  if (!updatedWallet) {
    throw unprocessable("Insufficient wallet balance");
  }

  const updatedUser = await syncUserWalletBalance(user._id, updatedWallet.balanceUnits, session);
  if (!updatedUser) {
    throw notFound("Account was not found");
  }

  const transaction = {
    user: user._id,
    type: "debit",
    source: "plan_purchase",
    amountPaise: Math.round(Number(plan.price || 0) * 100),
    connectsDeltaUnits: -connectsUnits,
    balanceAfterUnits: updatedWallet.balanceUnits,
    reference: String(plan._id),
    description: `Purchased ${plan.name}`
  };

  if (session) {
    await WalletTransaction.create([transaction], { session });
  } else {
    await WalletTransaction.create(transaction);
  }

  return updatedUser;
}

export async function debitWalletForApiUsage({ user, service, connects, reference = "", session = null }) {
  const connectsUnits = Math.round(Number(connects || 0) * 100);
  if (!Number.isFinite(connectsUnits) || connectsUnits <= 0) {
    throw unprocessable("API fee is not configured");
  }

  await ensureWalletForUser(user, { session });
  const updatedWallet = await Wallet.findOneAndUpdate(
    { user: user._id, balanceUnits: { $gte: connectsUnits } },
    { $inc: { balanceUnits: -connectsUnits } },
    withSessionOptions({ new: true }, session)
  );

  if (!updatedWallet) {
    throw unprocessable(`Insufficient wallet balance. Please recharge your ${walletBrandForUser(user)} wallet.`);
  }

  const updatedUser = await syncUserWalletBalance(user._id, updatedWallet.balanceUnits, session);
  if (!updatedUser) {
    throw notFound("Account was not found");
  }

  const transaction = {
    user: user._id,
    type: "debit",
    source: "api_usage",
    amountPaise: 0,
    connectsDeltaUnits: -connectsUnits,
    balanceAfterUnits: updatedWallet.balanceUnits,
    reference,
    description: `${service} verification fee`
  };

  if (session) {
    await WalletTransaction.create([transaction], { session });
  } else {
    await WalletTransaction.create(transaction);
  }

  return updatedUser;
}

export async function refundWalletForApiUsage({ user, service, reference = "", session = null }) {
  const cleanReference = String(reference || "").trim();
  if (!cleanReference) return null;

  const existingRefund = await WalletTransaction.findOne({
    user: user._id,
    source: "system",
    reference: `${cleanReference}:refund`
  });
  if (existingRefund) return user;

  const debit = await WalletTransaction.findOne({
    user: user._id,
    type: "debit",
    source: "api_usage",
    reference: cleanReference
  });
  if (!debit) return null;

  const refundUnits = Math.abs(Number(debit.connectsDeltaUnits || 0));
  if (!Number.isFinite(refundUnits) || refundUnits <= 0) return null;

  await ensureWalletForUser(user, { session });
  const updatedWallet = await Wallet.findOneAndUpdate(
    { user: user._id },
    { $inc: { balanceUnits: refundUnits } },
    withSessionOptions({ new: true }, session)
  );

  if (!updatedWallet) {
    throw notFound("Wallet was not found");
  }

  const updatedUser = await syncUserWalletBalance(user._id, updatedWallet.balanceUnits, session);
  if (!updatedUser) {
    throw notFound("Account was not found");
  }

  const transaction = {
    user: user._id,
    type: "credit",
    source: "system",
    amountPaise: 0,
    connectsDeltaUnits: refundUnits,
    balanceAfterUnits: updatedWallet.balanceUnits,
    reference: `${cleanReference}:refund`,
    description: `${service} API fee refund`
  };

  if (session) {
    await WalletTransaction.create([transaction], { session });
  } else {
    await WalletTransaction.create(transaction);
  }

  return updatedUser;
}

export async function creditWalletForResellerMargin({ user, service, connects, reference = "", sourceUserName = "", session = null }) {
  const connectsUnits = Math.round(Number(connects || 0) * 100);
  if (!Number.isFinite(connectsUnits) || connectsUnits <= 0) {
    return null;
  }

  await ensureWalletForUser(user, { session });
  const updatedWallet = await Wallet.findOneAndUpdate(
    { user: user._id },
    { $inc: { balanceUnits: connectsUnits } },
    withSessionOptions({ new: true }, session)
  );

  if (!updatedWallet) {
    throw notFound("Wallet was not found");
  }

  const updatedUser = await syncUserWalletBalance(user._id, updatedWallet.balanceUnits, session);
  if (!updatedUser) {
    throw notFound("Account was not found");
  }

  const transaction = {
    user: user._id,
    type: "credit",
    source: "system",
    amountPaise: 0,
    connectsDeltaUnits: connectsUnits,
    balanceAfterUnits: updatedWallet.balanceUnits,
    reference,
    description: `${service} reseller margin${sourceUserName ? ` from ${sourceUserName}` : ""}`
  };

  if (session) {
    await WalletTransaction.create([transaction], { session });
  } else {
    await WalletTransaction.create(transaction);
  }

  return updatedUser;
}

export async function assertWalletHasBalance({ user, connects }) {
  const connectsUnits = Math.round(Number(connects || 0) * 100);
  if (!Number.isFinite(connectsUnits) || connectsUnits <= 0) {
    throw unprocessable("API fee is not configured");
  }

  const wallet = await ensureWalletForUser(user);
  if (!wallet || wallet.balanceUnits < connectsUnits) {
    throw unprocessable("Insufficient wallet balance to run this verification");
  }

  return true;
}

async function syncUserWalletBalance(userId, balanceUnits, session = null) {
  return User.findByIdAndUpdate(
    userId,
    { walletBalanceUnits: balanceUnits },
    withSessionOptions({ new: true }, session)
  );
}

function withSessionOptions(options, session) {
  return session ? { ...options, session } : options;
}

function isTransactionUnsupported(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === 20 ||
    error?.codeName === "IllegalOperation" ||
    (message.includes("transaction") && (message.includes("replica set") || message.includes("mongos")))
  );
}

function resolveUserId(user) {
  return user?._id || user?.id || user;
}

function legacyWalletBalanceUnits(user) {
  return Math.max(0, Math.round(Number(user?.walletBalanceUnits || 0)));
}

function toTransactionDto(transaction) {
  return {
    id: String(transaction._id),
    type: transaction.type,
    source: transaction.source,
    amount: paiseToRupees(transaction.amountPaise),
    connectsDelta: unitsToConnects(transaction.connectsDeltaUnits),
    balanceAfter: unitsToConnects(transaction.balanceAfterUnits),
    description: transaction.description,
    reference: transaction.reference,
    invoiceId: transaction.invoiceId || "",
    invoiceViewUrl: transaction.invoiceViewUrl || "",
    invoiceDownloadUrl: transaction.invoiceDownloadUrl || "",
    accountName: transaction.user?.name || "",
    accountEmail: transaction.user?.email || "",
    accountRole: transaction.user?.role || "",
    createdAt: transaction.createdAt
  };
}

function toInvoiceDto(recharge) {
  const amountPaise = Number(recharge.amountPaise || 0);
  const gstAmountPaise = Number(recharge.gstAmountPaise || rechargeGstPaise(amountPaise));
  const walletCreditAmountPaise = Number(recharge.walletCreditAmountPaise || amountPaise);
  const payableAmountPaise = Number(recharge.payableAmountPaise || rechargePayablePaise(amountPaise, gstAmountPaise));
  const roundingAdjustmentPaise = Number(recharge.roundingAdjustmentPaise || Math.max(0, payableAmountPaise - amountPaise - gstAmountPaise));
  return {
    id: String(recharge._id),
    invoiceId: recharge.billingInvoiceId || "",
    viewUrl: recharge.billingInvoiceViewUrl || "",
    downloadUrl: recharge.billingInvoiceDownloadUrl || "",
    amount: paiseToRupees(amountPaise),
    gstRate: RECHARGE_GST_PERCENT,
    gstAmount: paiseToRupees(gstAmountPaise),
    walletCreditAmount: paiseToRupees(walletCreditAmountPaise),
    payableAmount: paiseToRupees(payableAmountPaise),
    roundingAdjustment: paiseToRupees(roundingAdjustmentPaise),
    status: recharge.billingInvoiceStatus || "",
    userName: recharge.user?.name || "",
    userEmail: recharge.user?.email || "",
    userRole: recharge.user?.role || "",
    paidAt: recharge.paidAt || recharge.createdAt,
    createdAt: recharge.createdAt
  };
}

