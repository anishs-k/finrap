import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { indianStateNameFromCode } from "../../constants/indian-states.js";
import { ROLES } from "../../constants/roles.js";
import { getBillingSettings } from "../system/system-setting.service.js";
import { User } from "../users/user.model.js";
import { paiseToRupees } from "./wallet.utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FINREP_QR_PATH = path.resolve(__dirname, "../../assets/finrep_qr.png");
let cachedFinrepQrDataUrl = "";

export async function generateWalletRechargeInvoice({ user, recharge }) {
  const settings = await getBillingSettings();
  const supplierState = firstPresent(settings.supplierState, indianStateNameFromCode(settings.supplierStateCode), "Maharashtra");
  const clientState = firstPresent(indianStateNameFromCode(user.stateCode), user.state, supplierState);
  const invoiceDate = new Date();
  const dueDate = addDays(invoiceDate, 2);

  const invoicePayload = {
    rechargeAmount: paiseToRupees(recharge.amountPaise),
    gstRate: 18,
    invoiceDate: formatInvoiceDate(invoiceDate),
    dueDate: formatInvoiceDate(dueDate),
    firmName: firstPresent(settings.firmName, "Finrep Services"),
    firmAddress: firstPresent(settings.firmAddress, supplierState),
    supplierState,
    supplierCountry: "India",
    supplierPincode: settings.supplierPincode || "",
    supplierGstin: settings.supplierGstin || "",
    supplierPan: settings.supplierPan || "",
    supplierPhone: settings.supplierPhone || "",
    supplierEmail: settings.supplierEmail || "",
    placeOfSupply: "Maharashtra - 27",
    sacCode: firstPresent(settings.sacCode, "997159"),
    serviceDescription: "Wallet Recharge",
    unit: "NOS",
    billedTo: firstPresent(user.name, user.email, "Client"),
    billedToAddress: user.roadStreet || "",
    clientState,
    clientPincode: user.pincode || "",
    clientGstin: user.gstin || "",
    clientPan: user.pan || "",
    clientPhone: user.contact || "",
    clientEmail: user.email || "",
    bankName: "Kotak Mahindra Bank",
    accountName: "FREP FINTECH SOLUTIONS PVT. LTD.",
    accountNo: "4250209237",
    ifscCode: "KKBK0000682",
    accountType: "Current",
    branch: "LBS Marg, Ghatkopar",
    upiId: "frepfintech@kotak",
    authorizedSignatoryName: "Surendra Yeleswaram",
    authorizedSignatoryDesignation: "Founder",
    authorizedSignatoryDate: "05-06-2026",
    footerText: "FREP FINTECH SOLUTIONS PVT. LTD. | GSTIN: 27AAGCF1714M1ZJ | accounts@thefinrep.com"
  };

  const logoDataUrl = await resolveInvoiceLogoDataUrl(user);
  if (logoDataUrl) {
    invoicePayload.logoDataUrl = logoDataUrl;
  }

  const upiQrDataUrl = await resolveFinrepQrDataUrl();
  if (upiQrDataUrl) {
    invoicePayload.upiQrDataUrl = upiQrDataUrl;
  }

  const response = await fetch(`${trimTrailingSlash(env.billingProvider.baseUrl)}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.billingProvider.token ? { "x-api-token": env.billingProvider.token } : {})
    },
    body: JSON.stringify(invoicePayload)
  });

  const raw = await response.text();
  const data = parseJson(raw);
  if (!response.ok) {
    throw new Error(invoiceErrorMessage(data, raw));
  }

  const invoiceId = extractInvoiceId(data);
  if (!invoiceId) {
    throw new Error("Billing API did not return invoiceId");
  }

  const publicBase = trimTrailingSlash(env.billingProvider.publicBaseUrl);
  return {
    invoiceId,
    invoiceViewUrl: `${publicBase}/invoices/${encodeURIComponent(invoiceId)}/view`,
    invoiceDownloadUrl: `${publicBase}/invoices/${encodeURIComponent(invoiceId)}/download`,
    providerResponse: data
  };
}

export async function fetchWalletRechargeInvoiceFile({ invoiceId, action = "download", sourceUrl = "" }) {
  const cleanInvoiceId = String(invoiceId || "").trim();
  if (!cleanInvoiceId) {
    throw new Error("Invoice ID is required");
  }

  const cleanAction = action === "view" ? "view" : "download";
  const targetUrl = String(sourceUrl || "").trim()
    || `${trimTrailingSlash(env.billingProvider.baseUrl)}/invoices/${encodeURIComponent(cleanInvoiceId)}/${cleanAction}`;
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: billingInvoiceFileHeaders(targetUrl)
  });

  if (!response.ok) {
    const raw = await response.text();
    const data = parseJson(raw);
    throw new Error(invoiceErrorMessage(data, raw));
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const disposition = response.headers.get("content-disposition") || "";
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `wallet-recharge-invoice-${cleanInvoiceId}.pdf`;

  return {
    fileName,
    contentType: response.headers.get("content-type") || "application/pdf",
    buffer
  };
}

function billingInvoiceFileHeaders(targetUrl) {
  if (!env.billingProvider.token) return {};

  const url = String(targetUrl || "");
  const currentBase = trimTrailingSlash(env.billingProvider.baseUrl);
  const currentPublicBase = trimTrailingSlash(env.billingProvider.publicBaseUrl);
  const needsToken = (
    url.startsWith(currentBase) ||
    url.startsWith(currentPublicBase) ||
    url.includes("service.algebrasoftech.com/billing")
  );

  return needsToken ? { "x-api-token": env.billingProvider.token } : {};
}

async function resolveInvoiceLogoDataUrl(user) {
  const profile = user.role === ROLES.SUPER_ADMIN
    ? user
    : await User.findOne({ role: ROLES.SUPER_ADMIN }).select("avatarUrl").lean();
  const logo = String(profile?.avatarUrl || "").trim();
  return logo.startsWith("data:image/") ? logo : "";
}

async function resolveFinrepQrDataUrl() {
  if (cachedFinrepQrDataUrl) return cachedFinrepQrDataUrl;

  try {
    const buffer = await readFile(FINREP_QR_PATH);
    cachedFinrepQrDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    return cachedFinrepQrDataUrl;
  } catch {
    return "";
  }
}

function extractInvoiceId(data) {
  return String(
    data?.invoiceId ||
    data?.id ||
    data?._id ||
    data?.data?.invoiceId ||
    data?.data?.id ||
    data?.data?._id ||
    data?.invoice?.invoiceId ||
    data?.invoice?.id ||
    data?.invoice?._id ||
    ""
  ).trim();
}

function invoiceErrorMessage(data, raw) {
  return data?.message || data?.error || data?.errors?.[0]?.message || raw || "Billing invoice request failed";
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function firstPresent(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function formatInvoiceDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}
