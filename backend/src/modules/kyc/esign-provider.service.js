import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";
import { providerFetch } from "./provider-auth.service.js";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const FALLBACK_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const ESIGN_FILE_NAME = "data-masters-aadhaar-esign-agreement.pdf";
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ESIGN_TEMPLATE_PATH = path.resolve(MODULE_DIR, "../../pdf/WEB APP AGENT & SUB-AGENT REGISTRATION AGREEMENT.pdf");

export async function createLeegalitySign({ name, email, phone, fileBuffer, fileName = "data-masters-kyc-consent.pdf" }) {
  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("phone", phone);
  form.set("file", new Blob([fileBuffer], { type: "application/pdf" }), fileName);

  const response = await providerFetch(env.esignProvider, "Leegality eSign", `${env.esignProvider.baseUrl}/create-sign/`, {
    method: "POST",
    body: form
  });

  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok || body?.success === false || body?.status === "failed") {
    const message = body?.message || body?.error || body?.detail || text.slice(0, 180) || "Leegality eSign request failed";
    throw unprocessable(message);
  }

  return body || { success: true, message: "eSign request created" };
}

export async function fetchLeegalitySignStatus({ documentId, providerResponse }) {
  const safeDocumentId = String(documentId || extractLeegalityDocumentId(providerResponse) || "").trim();
  const signUrl = extractLeegalitySignUrl(providerResponse);

  const statusResponse = safeDocumentId ? await tryLeegalityStatusApi(safeDocumentId) : null;
  if (statusResponse) {
    return statusResponse;
  }

  const invitationStatus = signUrl ? await fetchStatusFromSignInvitation(signUrl) : null;
  if (invitationStatus && ["signed", "expired"].includes(invitationStatus.status)) {
    return invitationStatus;
  }

  const publicDocumentStatus = safeDocumentId ? await fetchPublicDocumentStatus(safeDocumentId) : null;
  if (publicDocumentStatus && ["signed", "expired"].includes(publicDocumentStatus.status)) {
    return publicDocumentStatus;
  }

  if (invitationStatus) {
    return invitationStatus;
  }

  if (publicDocumentStatus) {
    return publicDocumentStatus;
  }

  if (!signUrl) {
    throw unprocessable("eSign signing link is not available for status check");
  }

  return fetchStatusFromSignUrl(signUrl);
}

async function tryLeegalityStatusApi(documentId) {
  const explicitUrl = env.esignProvider.statusUrl
    ? env.esignProvider.statusUrl
        .replace("{documentId}", encodeURIComponent(documentId))
        .replace(":documentId", encodeURIComponent(documentId))
    : "";
  const baseUrl = String(env.esignProvider.baseUrl || "").replace(/\/+$/, "");
  const candidates = [
    ...(explicitUrl ? [{ method: "GET", url: explicitUrl }] : []),
    { method: "GET", url: `${baseUrl}/document-status/${encodeURIComponent(documentId)}/` },
    { method: "GET", url: `${baseUrl}/document-status/?document_id=${encodeURIComponent(documentId)}` },
    { method: "POST", url: `${baseUrl}/document-status/`, body: { document_id: documentId } },
    { method: "GET", url: `${baseUrl}/status/${encodeURIComponent(documentId)}/` },
    { method: "GET", url: `${baseUrl}/status/?document_id=${encodeURIComponent(documentId)}` },
    { method: "POST", url: `${baseUrl}/status/`, body: { document_id: documentId } }
  ];

  for (const candidate of candidates) {
    const body = await requestStatusCandidate(candidate);
    if (body) return body;
  }

  return null;
}

async function requestStatusCandidate(candidate) {
  try {
    const response = await providerFetch(env.esignProvider, "Leegality eSign status", candidate.url, {
      method: candidate.method,
      ...(candidate.body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(candidate.body)
          }
        : {})
    });
    const text = await response.text();
    const body = parseJson(text);
    if (!response.ok || body?.success === false || body?.status === "failed") {
      return null;
    }
    return parseLeegalityStatusBody(body, "leegality_status_api") || body || { success: true, message: "Document status fetched" };
  } catch {
    return null;
  }
}

async function fetchStatusFromSignInvitation(signUrl) {
  const invitationId = extractLeegalityInvitationId(signUrl);
  if (!invitationId) return null;

  try {
    const origin = new URL(signUrl).origin;
    const response = await fetch(`${origin}/api/sign/request/${encodeURIComponent(invitationId)}`, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        Referer: signUrl,
        "User-Agent": "FinrepStatusCheck/1.0"
      }
    });
    const text = await response.text();
    const body = parseJson(text);
    if (!response.ok || !body) {
      return parseStatusFromText(text, "sign_invitation_api");
    }

    const parsed = parseLeegalityStatusBody(body, "sign_invitation_api");
    if (parsed) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchPublicDocumentStatus(documentId) {
  try {
    const encoded = encodeURIComponent(documentId);
    const response = await fetch(`https://app1.leegality.com/api/v2.1/document/public?trackingId=${encoded}`, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        "User-Agent": "FinrepStatusCheck/1.0"
      }
    });
    const text = await response.text();
    const body = parseJson(text);
    if (!response.ok || !body || Number(body.status) !== 1) {
      return null;
    }

    const parsed = parseLeegalityStatusBody(body, "public_document_api");
    if (parsed?.status === "signed" || parsed?.status === "expired") {
      return parsed;
    }

    const hash = body.data?.document?.hash;
    if (!hash) {
      return parsed;
    }

    const inviteResponse = await fetch(
      `https://app1.leegality.com/api/v2.1/document/invitations/public?trackingId=${encoded}&hash=${encodeURIComponent(hash)}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(15000),
        headers: {
          Accept: "application/json",
          "User-Agent": "FinrepStatusCheck/1.0"
        }
      }
    );
    const inviteText = await inviteResponse.text();
    const inviteBody = parseJson(inviteText);
    if (!inviteResponse.ok || !inviteBody || Number(inviteBody.status) !== 1) {
      return parsed;
    }

    return parseLeegalityStatusBody(inviteBody, "public_invitations_api") || parsed;
  } catch {
    return null;
  }
}

export async function loadDefaultEsignPdf({ name = "", email = "", phone = "" } = {}) {
  void name;
  void email;
  void phone;

  let fileBuffer;
  try {
    fileBuffer = await readFile(ESIGN_TEMPLATE_PATH);
  } catch (error) {
    throw unprocessable(`Default eSign agreement could not be loaded: ${error.message}`);
  }

  if (!fileBuffer.length || fileBuffer.subarray(0, 4).toString("ascii") !== "%PDF") {
    throw unprocessable("Default eSign agreement is not a valid PDF");
  }

  if (fileBuffer.length > MAX_PDF_BYTES) {
    throw unprocessable("Default eSign agreement must be 4 MB or smaller");
  }

  return {
    fileBuffer,
    fileName: ESIGN_FILE_NAME
  };
}

function fetchStatusFromSignUrl(signUrl) {
  return fetch(signUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "FinrepStatusCheck/1.0"
    }
  })
    .then(async (response) => {
      const body = await response.text();
      const normalized = body.toLowerCase();
      if (
        normalized.includes("document has been signed") ||
        normalized.includes("document is signed") ||
        normalized.includes("already signed") ||
        normalized.includes("has been signed")
      ) {
        return {
          success: true,
          status: "signed",
          message: "Document has been signed",
          signedDocumentUrl: extractSignedDocumentUrl(body, response.url || signUrl),
          publicDocumentUrl: response.url || signUrl,
          source: "sign_url_page"
        };
      }

      if (
        normalized.includes("expired") ||
        normalized.includes("invitation timed out") ||
        normalized.includes("link has expired")
      ) {
        return {
          success: false,
          status: "expired",
          message: "eSign invitation has expired",
          source: "sign_url_page"
        };
      }

      return {
        success: true,
        status: "pending",
        message: response.ok ? "Document is not signed yet" : `Unable to confirm signature status (${response.status})`,
        source: "sign_url_page"
      };
    })
    .catch((error) => {
      throw unprocessable(`Unable to fetch eSign status: ${error.message}`);
    });
}

function parseLeegalityStatusBody(body, source) {
  const normalizedText = JSON.stringify(body || {}).toLowerCase();
  const data = body?.data || body;
  const document = data?.document || {};
  const invitees = [
    ...(Array.isArray(data?.invitations) ? data.invitations : []),
    ...(Array.isArray(data?.invitees) ? data.invitees : []),
    ...(Array.isArray(document?.invitations) ? document.invitations : []),
    ...(Array.isArray(document?.invitees) ? document.invitees : [])
  ];
  const documents = [
    ...(Array.isArray(data?.documents) ? data.documents : []),
    ...(Array.isArray(document?.documents) ? document.documents : [])
  ];
  const documentStatus = String(document.status || data.documentStatus || data.status || body.status || "").trim();
  const signedInvitees = invitees.filter((invitee) => invitee?.signed === true || String(invitee?.status || "").toLowerCase().includes("signed"));
  const expiredInvitees = invitees.filter((invitee) => invitee?.expired === true || String(invitee?.status || "").toLowerCase().includes("expired"));
  const completedDocument = [documentStatus, ...documents.map((item) => item?.status || "")]
    .map((status) => String(status || "").toLowerCase())
    .some((status) => status.includes("completed") || status.includes("signed"));

  if (signedInvitees.length > 0 || completedDocument || normalizedText.includes("already signed") || normalizedText.includes("has been signed")) {
    const documentId = findFirstValue(body, ["documentId", "document_id", "documentID", "trackingId", "tracking_id"]) || findFirstValue(data, ["documentId", "document_id", "documentID", "trackingId", "tracking_id"]);
    return {
      success: true,
      status: "signed",
      message: "Document has been signed",
      signedDocumentUrl: extractSignedDocumentUrl(body, "https://app1.leegality.com"),
      publicDocumentUrl: buildLeegalityPublicDocumentUrl(documentId),
      source,
      data
    };
  }

  if (expiredInvitees.length > 0 || normalizedText.includes("expired") || normalizedText.includes("link has expired")) {
    return {
      success: false,
      status: "expired",
      message: "eSign invitation has expired",
      source,
      data
    };
  }

  if (body?.status === 1 || documentStatus || invitees.length > 0 || documents.length > 0) {
    return {
      success: true,
      status: "pending",
      message: "Document is not signed yet",
      source,
      data
    };
  }

  return null;
}

function parseStatusFromText(text, source) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes("document has been signed") ||
    normalized.includes("document is signed") ||
    normalized.includes("already signed") ||
    normalized.includes("has been signed")
  ) {
    return {
      success: true,
      status: "signed",
      message: "Document has been signed",
      signedDocumentUrl: extractSignedDocumentUrl(text, "https://app1.leegality.com"),
      publicDocumentUrl: "",
      source
    };
  }

  if (normalized.includes("expired") || normalized.includes("invitation timed out") || normalized.includes("link has expired")) {
    return {
      success: false,
      status: "expired",
      message: "eSign invitation has expired",
      source
    };
  }

  return null;
}

function extractLeegalityInvitationId(signUrl) {
  try {
    const pathname = new URL(signUrl).pathname;
    const match = pathname.match(/\/sign\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function extractSignedDocumentUrl(source, baseUrl = "") {
  if (!source) return "";

  if (typeof source === "string") {
    const hrefMatches = Array.from(source.matchAll(/href=["']([^"']+)["'][^>]*(?:download|signed|pdf)|(?:download|signed|pdf)[^>]*href=["']([^"']+)["']/gi));
    const href = hrefMatches.map((match) => match[1] || match[2]).find(Boolean);
    if (href) return normalizeAbsoluteUrl(href, baseUrl);

    const urlMatch = source.match(/https?:\/\/[^\s"'<>]+(?:signed|download|pdf)[^\s"'<>]*/i);
    return urlMatch ? urlMatch[0] : "";
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const value = extractSignedDocumentUrl(item, baseUrl);
      if (value) return value;
    }
    return "";
  }

  if (typeof source !== "object") return "";

  const keys = [
    "signedDocumentUrl",
    "signed_document_url",
    "signedDocUrl",
    "signed_doc_url",
    "signedPdfUrl",
    "signed_pdf_url",
    "downloadSignedDocumentUrl",
    "download_signed_document_url",
    "documentDownloadUrl",
    "document_download_url",
    "downloadUrl",
    "download_url",
    "pdfUrl",
    "pdf_url",
    "fileUrl",
    "file_url"
  ];

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeAbsoluteUrl(value.trim(), baseUrl);
    }
  }

  for (const value of Object.values(source)) {
    const nested = extractSignedDocumentUrl(value, baseUrl);
    if (nested) return nested;
  }

  return "";
}

function normalizeAbsoluteUrl(value, baseUrl = "") {
  if (/^https?:\/\//i.test(value)) return value;
  if (!baseUrl) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function buildLeegalityPublicDocumentUrl(documentId) {
  const value = String(documentId || "").trim();
  return value ? `https://app1.leegality.com/document/public?documentId=${encodeURIComponent(value)}` : "";
}

export function extractLeegalityDocumentId(response) {
  return findFirstValue(response, ["documentId", "document_id", "documentID", "id", "requestId", "request_id", "client_id"]);
}

export function extractLeegalitySignUrl(response) {
  const value = findFirstValue(response, [
    "signUrl",
    "sign_url",
    "signLink",
    "sign_link",
    "signingUrl",
    "signing_url",
    "signingLink",
    "signing_link",
    "aadhaarEsignUrl",
    "aadhaar_esign_url",
    "aadhaarEsignLink",
    "aadhaar_esign_link",
    "redirectUrl",
    "redirect_url",
    "inviteUrl",
    "invite_url",
    "invitationLink",
    "invitation_link",
    "documentUrl",
    "document_url",
    "link",
    "url"
  ]);
  return /^https?:\/\//i.test(value) ? value : "";
}

export function normalizeLeegalityStatus(response) {
  return String(findFirstValue(response, ["status", "signing_status", "documentStatus", "document_status", "message"]) || "created").trim() || "created";
}

export function isReusableLeegalityDraft({ providerResponse, phone, createdAt, status }) {
  if (!providerResponse || typeof providerResponse !== "object") return false;
  if (!extractLeegalitySignUrl(providerResponse)) return false;

  const normalizedStatus = String(status || normalizeLeegalityStatus(providerResponse)).toLowerCase();
  if (["failed", "failure", "invalid", "rejected", "cancelled", "canceled", "expired"].some((item) => normalizedStatus.includes(item))) {
    return false;
  }

  const providerPhone = findFirstValue(providerResponse, ["phone", "mobile", "mobileNumber", "mobile_number"]);
  if (providerPhone && lastDigits(providerPhone, 4) !== lastDigits(phone, 4)) {
    return false;
  }

  const expiresAt = extractLeegalityExpiry(providerResponse);
  if (expiresAt) {
    return expiresAt.getTime() > Date.now();
  }

  const created = parseDate(createdAt);
  return created ? Date.now() - created.getTime() < FALLBACK_DRAFT_TTL_MS : true;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractLeegalityExpiry(response) {
  const value = findFirstValue(response, [
    "expiresAt",
    "expires_at",
    "expiry",
    "expiryDate",
    "expiry_date",
    "expiryAt",
    "expiry_at",
    "validTill",
    "valid_till",
    "validUntil",
    "valid_until",
    "linkExpiresAt",
    "link_expires_at"
  ]);
  return parseDate(value);
}

function findFirstValue(source, keys) {
  if (!source) return "";
  if (Array.isArray(source)) {
    for (const value of source) {
      const nested = findFirstValue(value, keys);
      if (nested) return nested;
    }
    return "";
  }
  if (typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }

  for (const value of Object.values(source)) {
    const nested = findFirstValue(value, keys);
    if (nested) return nested;
  }

  return "";
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    const millis = numeric > 9999999999 ? numeric : numeric * 1000;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function lastDigits(value, count) {
  return String(value || "").replace(/\D/g, "").slice(-count);
}

