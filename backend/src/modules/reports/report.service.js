import mongoose from "mongoose";
import { ROLES } from "../../constants/roles.js";
import { parsePagination } from "../../utils/pagination.js";
import { User } from "../users/user.model.js";
import { Verification } from "../verification/verification.model.js";
import { WalletTransaction } from "../wallet/wallet-transaction.model.js";

const API_REPORT_SERVICES = [
  "CIBIL",
  "CIBIL_JSON",
  "EQUIFAX",
  "EQUIFAX_JSON",
  "CRIF",
  "CRIF_JSON",
  "PAN",
  "AADHAAR_VALIDATION",
  "AADHAAR_OTP",
  "UAN_FETCH_BY_PAN",
  "UAN_PROFILE_DETAILS",
  "EMPLOYMENT_HISTORY",
  "EPFO_PASSBOOK",
  "GSTIN",
  "BANK_VERIFICATION",
  "DRIVING_LICENSE",
  "RC_BASIC",
  "MCA_COMPANY",
  "PREFILL",
  "ESIGN",
  "ECONSENT"
];

const SERVICE_LABELS = {
  CIBIL: "TU CIBIL PDF",
  CIBIL_JSON: "TU CIBIL JSON",
  EQUIFAX: "Equifax CIBIL PDF",
  EQUIFAX_JSON: "Equifax CIBIL JSON",
  CRIF: "CRIF PDF",
  CRIF_JSON: "CRIF JSON",
  PAN: "PAN Verification",
  AADHAAR_VALIDATION: "Aadhaar Validation",
  AADHAAR_OTP: "Aadhaar OTP",
  UAN_FETCH_BY_PAN: "Fetch UAN by PAN",
  UAN_PROFILE_DETAILS: "UAN Profile Details",
  EMPLOYMENT_HISTORY: "Employment History",
  EPFO_PASSBOOK: "EPFO Passbook",
  GSTIN: "GSTIN Verification",
  BANK_VERIFICATION: "Bank Verification",
  DRIVING_LICENSE: "Driving License Verification",
  RC_BASIC: "Basic RC Verification",
  MCA_COMPANY: "MCA Company Details",
  PREFILL: "Prefill",
  ESIGN: "Aadhaar eSign",
  ECONSENT: "e-Consent"
};

const PUBLIC_API_SLUGS_BY_SERVICE = {
  CIBIL: "tu-cibil-pdf",
  CIBIL_JSON: "tu-cibil-json",
  EQUIFAX: "equifax-cibil-pdf",
  EQUIFAX_JSON: "equifax-cibil-json",
  CRIF: "crif-pdf",
  CRIF_JSON: "crif-json",
  PAN: "pan-full-detail",
  AADHAAR_VALIDATION: "aadhaar-validation",
  AADHAAR_OTP: "aadhaar-otp-verify",
  UAN_FETCH_BY_PAN: "fetch-uan-by-pan",
  UAN_PROFILE_DETAILS: "uan-profile-details",
  EMPLOYMENT_HISTORY: "employment-history",
  EPFO_PASSBOOK: "epfo-passbook",
  GSTIN: "gstin-verification",
  BANK_VERIFICATION: "bank-verification",
  DRIVING_LICENSE: "driving-license-verification",
  RC_BASIC: "basic-rc-verification",
  MCA_COMPANY: "mca-company-details",
  PREFILL: "prefill",
  ESIGN: "aadhaar-esign",
  ECONSENT: "econsent"
};

const SERVICE_BY_PUBLIC_API_SLUG = Object.entries(PUBLIC_API_SLUGS_BY_SERVICE).reduce((map, [service, slug]) => {
  map[slug] = service;
  return map;
}, {});

export const REPORT_SERVICE_OPTIONS = API_REPORT_SERVICES.map((service) => ({
  value: service,
  label: SERVICE_LABELS[service]
}));

export async function buildUsageReport(user, query = {}) {
  const dateFrom = normalizeDateInput(query.dateFrom);
  const dateTo = normalizeDateInput(query.dateTo);
  const service = API_REPORT_SERVICES.includes(query.service) ? query.service : "";
  const allowedUserIds = await resolveReportUserIds(user);
  const requestedUserId = String(query.userId || "").trim();
  const userId = scopeRequestedUserId(requestedUserId, allowedUserIds);
  const pagination = parsePagination({ ...query, paged: "true" }, { defaultLimit: 10, maxLimit: 100 });
  const [users, records] = await Promise.all([
    reportUsersForScope(allowedUserIds),
    requestedUserId && !userId
      ? []
      : queryCombinedReportRecords({ dateFrom, dateTo, userId, service, allowedUserIds })
  ]);
  const pageRecords = records.slice(pagination.skip, pagination.skip + pagination.limit);

  return {
    filters: {
      dateFrom,
      dateTo,
      userId,
      service
    },
    users: users.map(toUserOption),
    services: REPORT_SERVICE_OPTIONS,
    records: {
      items: pageRecords,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: records.length,
        totalPages: Math.max(1, Math.ceil(records.length / pagination.limit))
      }
    }
  };
}

export async function buildUsageReportExcel(user, query = {}) {
  const dateFrom = normalizeDateInput(query.dateFrom);
  const dateTo = normalizeDateInput(query.dateTo);
  const service = API_REPORT_SERVICES.includes(query.service) ? query.service : "";
  const allowedUserIds = await resolveReportUserIds(user);
  const requestedUserId = String(query.userId || "").trim();
  const userId = scopeRequestedUserId(requestedUserId, allowedUserIds);
  const records = requestedUserId && !userId
    ? []
    : await queryCombinedReportRecords({ dateFrom, dateTo, userId, service, allowedUserIds });

  const rows = [
    ["Date", "Time", "User Name", "User Email", "User Role", "API", "Customer", "Identifier", "Status", "Request UID"],
    ...records.map((record) => {
      const createdAt = record.createdAt ? new Date(record.createdAt) : null;
      return [
        createdAt ? createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
        createdAt ? createdAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
        record.actorName || "",
        record.actorEmail || "",
        record.actorRole || "",
        record.serviceLabel || record.service,
        record.customerName,
        record.identifierMasked,
        record.status,
        record.providerReference || ""
      ];
    })
  ];

  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${rows
    .map((row, index) => `<tr>${row.map((cell) => index === 0 ? `<th>${htmlCell(cell)}</th>` : `<td>${htmlCell(cell)}</td>`).join("")}</tr>`)
    .join("")}</table></body></html>`;
}

async function queryCombinedReportRecords({ dateFrom, dateTo, userId, service, allowedUserIds }) {
  const verificationFilter = buildVerificationReportFilter({ dateFrom, dateTo, userId, service, allowedUserIds });
  const transactionFilter = buildPublicApiTransactionFilter({ dateFrom, dateTo, userId, service, allowedUserIds });
  const [verifications, transactions] = await Promise.all([
    Verification.find(verificationFilter)
      .populate("actor", "name email role")
      .sort({ createdAt: -1 }),
    WalletTransaction.find(transactionFilter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
  ]);
  const fallbackRecords = await publicApiFallbackRecords(verifications, transactions);
  return [
    ...verifications.map(toReportRecord),
    ...fallbackRecords
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function buildVerificationReportFilter({ dateFrom, dateTo, userId, service, allowedUserIds }) {
  const filter = {
    service: service || { $in: API_REPORT_SERVICES },
    ...dateFilter(dateFrom, dateTo)
  };

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.actor = new mongoose.Types.ObjectId(userId);
  } else if (Array.isArray(allowedUserIds)) {
    filter.actor = { $in: toObjectIds(allowedUserIds) };
  }

  return filter;
}

function buildPublicApiTransactionFilter({ dateFrom, dateTo, userId, service, allowedUserIds }) {
  const reference = service && PUBLIC_API_SLUGS_BY_SERVICE[service]
    ? new RegExp(`^public-api:${escapeRegExp(PUBLIC_API_SLUGS_BY_SERVICE[service])}:`)
    : /^public-api:/;
  const filter = {
    type: "debit",
    source: "api_usage",
    reference,
    ...dateFilter(dateFrom, dateTo)
  };

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.user = new mongoose.Types.ObjectId(userId);
  } else if (Array.isArray(allowedUserIds)) {
    filter.user = { $in: toObjectIds(allowedUserIds) };
  }

  return filter;
}

async function resolveReportUserIds(user) {
  if (user.role === ROLES.SUPER_ADMIN) return null;

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

  return Array.from(seen);
}

function scopeRequestedUserId(userId, allowedUserIds) {
  if (!userId) return "";
  if (!mongoose.Types.ObjectId.isValid(userId)) return "";
  if (!Array.isArray(allowedUserIds)) return userId;
  return allowedUserIds.includes(String(userId)) ? userId : "";
}

function reportUsersForScope(allowedUserIds) {
  const filter = Array.isArray(allowedUserIds)
    ? { _id: { $in: toObjectIds(allowedUserIds) }, role: { $ne: ROLES.SUPER_ADMIN } }
    : { role: { $ne: ROLES.SUPER_ADMIN } };

  return User.find(filter).select("name email role").sort({ name: 1, email: 1 });
}

function toObjectIds(ids = []) {
  return ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function dateFilter(dateFrom, dateTo) {
  const createdAt = {};
  const from = parseDateStart(dateFrom);
  const to = parseDateEnd(dateTo);

  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;

  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
}

function normalizeDateInput(value) {
  const clean = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : "";
}

function parseDateStart(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toUserOption(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function toReportRecord(record) {
  return {
    id: String(record._id),
    service: record.service,
    serviceLabel: SERVICE_LABELS[record.service] || record.service,
    status: record.status,
    customerName: record.customerName,
    identifierMasked: record.identifierMasked,
    providerReference: record.providerReference || "",
    actorId: record.actor?._id ? String(record.actor._id) : "",
    actorName: record.actor?.name || "",
    actorEmail: record.actor?.email || "",
    actorRole: record.actor?.role || "",
    createdAt: record.createdAt
  };
}

async function publicApiFallbackRecords(verifications, transactions) {
  const loggedReferences = new Set(
    verifications
      .map((record) => String(record.details?.billingReference || "").trim())
      .filter(Boolean)
  );
  const fallbackTransactions = transactions.filter((transaction) => {
    const reference = String(transaction.reference || "").trim();
    return reference && !loggedReferences.has(reference);
  });
  if (fallbackTransactions.length === 0) return [];

  const refundReferences = fallbackTransactions.map((transaction) => `${transaction.reference}:refund`);
  const refunds = await WalletTransaction.find({
    source: "system",
    reference: { $in: refundReferences }
  }).select("reference");
  const refunded = new Set(refunds.map((refund) => String(refund.reference || "").replace(/:refund$/, "")));

  return fallbackTransactions
    .map((transaction) => toPublicApiFallbackRecord(transaction, refunded.has(String(transaction.reference || ""))))
    .filter(Boolean);
}

function toPublicApiFallbackRecord(transaction, wasRefunded) {
  const service = serviceFromPublicApiTransaction(transaction);
  if (!service) return null;
  const user = transaction.user || {};
  return {
    id: `wallet-${transaction._id}`,
    service,
    serviceLabel: SERVICE_LABELS[service] || transaction.description || service,
    status: wasRefunded ? "failed" : "verified",
    customerName: "Public API",
    identifierMasked: "-",
    providerReference: transaction.reference || "",
    actorId: user?._id ? String(user._id) : "",
    actorName: user?.name || "",
    actorEmail: user?.email || "",
    actorRole: user?.role || "",
    createdAt: transaction.createdAt
  };
}

function serviceFromPublicApiTransaction(transaction) {
  const reference = String(transaction.reference || "");
  const slug = reference.match(/^public-api:([^:]+):/)?.[1] || "";
  if (SERVICE_BY_PUBLIC_API_SLUG[slug]) return SERVICE_BY_PUBLIC_API_SLUG[slug];
  const description = String(transaction.description || "").toLowerCase();
  return Object.entries(SERVICE_LABELS).find(([, label]) => description.includes(label.toLowerCase()))?.[0] || "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function htmlCell(value) {
  const text = String(value ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
