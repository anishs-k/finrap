import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";

const DEFAULT_ECONSENT_SENDER_NAME = "Finrep";
const DEFAULT_ECONSENT_SENDER_EMAIL = "info@thefinrep.com";

function configuredBaseUrl() {
  return String(env.eConsent?.baseUrl || "").replace(/\/+$/, "");
}

function assertConfigured() {
  if (!env.eConsent?.token) {
    throw unprocessable("e-Consent API token is not configured");
  }
}

function endpoint(path) {
  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    throw unprocessable("e-Consent API base URL is not configured");
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function providerMessage(payload, fallback) {
  return String(payload?.message || payload?.error || payload?.statusLabel || payload?.status || fallback || "").trim();
}

function isPdfBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function cleanBase64Pdf(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^data:application\/pdf;base64,(.+)$/i);
  return match ? match[1] : raw;
}

function parseProviderPdfResponse(buffer, { fallbackFileName, fallbackContentType, fallbackMessage }) {
  const bytes = Buffer.from(buffer || []);
  if (isPdfBuffer(bytes)) {
    return {
      buffer: bytes,
      fileName: fallbackFileName,
      contentType: fallbackContentType || "application/pdf"
    };
  }

  const text = bytes.toString("utf8");
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    throw unprocessable(fallbackMessage || "Provider did not return a valid PDF document");
  }

  const fileValue = payload?.file || payload?.data?.file || payload?.document || payload?.data?.document || payload?.base64 || payload?.data?.base64;
  const pdfBuffer = Buffer.from(cleanBase64Pdf(fileValue), "base64");
  if (!isPdfBuffer(pdfBuffer)) {
    throw unprocessable(providerMessage(payload, fallbackMessage || "Provider did not return a valid PDF document"));
  }

  return {
    buffer: pdfBuffer,
    fileName: payload.fileName || payload.file_name || payload.name || fallbackFileName,
    contentType: payload.contentType || payload.content_type || fallbackContentType || "application/pdf"
  };
}

function normalizeDataUrl(dataUrl) {
  const value = String(dataUrl || "");
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw unprocessable("Upload a valid PDF document");
  }
  if (!/pdf/i.test(match[1])) {
    throw unprocessable("Only PDF document upload is supported for e-Consent");
  }
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function cleanFileName(value, fallback = "document.pdf") {
  const name = String(value || fallback).trim() || fallback;
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanLocation(value) {
  return String(value || "").trim() || "India";
}

export async function createEConsentSession({ name, email, phone, documentTitle, documentFileName, documentFileDataUrl, location, date }) {
  assertConfigured();
  normalizeDataUrl(documentFileDataUrl);
  const title = String(documentTitle || "").trim() || "e-Consent Document";
  const fileName = cleanFileName(documentFileName || title);
  const requestPayload = {
    sender_name: DEFAULT_ECONSENT_SENDER_NAME,
    sender_email: DEFAULT_ECONSENT_SENDER_EMAIL,
    name: String(name || "").trim(),
    mobile: cleanPhone(phone),
    email: String(email || "").trim(),
    location: cleanLocation(location),
    date: String(date || new Date().toISOString()).trim(),
    document_title: title,
    document_file_name: fileName,
    document_file: String(documentFileDataUrl || "").trim()
  };

  const response = await fetch(endpoint("/v1/esign/econsent"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": env.eConsent.token
    },
    body: JSON.stringify(requestPayload)
  });
  const payload = await parseJsonResponse(response);
  const documentId = payload?.documentId || payload?.document_id || payload?.id || "";

  if (!response.ok || !documentId) {
    throw unprocessable(providerMessage(payload, "e-Consent session creation failed"));
  }

  return {
    provider: "econsent",
    documentTitle: title,
    documentFileName: fileName,
    signer: {
      name: String(name || "").trim(),
      email: String(email || "").trim(),
      mobile: cleanPhone(phone),
      location: cleanLocation(location)
    },
    ...payload
  };
}

export async function fetchEConsentStatus({ documentId }) {
  assertConfigured();
  const cleanDocumentId = String(documentId || "").trim();
  if (!cleanDocumentId) {
    throw unprocessable("e-Consent document id is missing");
  }

  const response = await fetch(endpoint(`/v1/esign/econsent/${encodeURIComponent(cleanDocumentId)}/status`), {
    method: "GET",
    headers: {
      "x-api-token": env.eConsent.token
    }
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw unprocessable(providerMessage(payload, "e-Consent status fetch failed"));
  }

  return {
    provider: "econsent",
    ...payload
  };
}

export async function shareEConsentDocument({ documentId }) {
  assertConfigured();
  const cleanDocumentId = String(documentId || "").trim();
  if (!cleanDocumentId) {
    throw unprocessable("e-Consent document id is missing");
  }

  const response = await fetch(endpoint(`/v1/esign/econsent/${encodeURIComponent(cleanDocumentId)}/share`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": env.eConsent.token
    },
    body: JSON.stringify({})
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw unprocessable(providerMessage(payload, "e-Consent share link generation failed"));
  }

  return {
    provider: "econsent",
    ...payload
  };
}

export async function downloadEConsentSignedDocument({ documentId }) {
  assertConfigured();
  const cleanDocumentId = String(documentId || "").trim();
  if (!cleanDocumentId) {
    throw unprocessable("e-Consent document id is missing");
  }

  const response = await fetch(endpoint(`/v1/esign/econsent/${encodeURIComponent(cleanDocumentId)}/files/signed`), {
    method: "GET",
    headers: {
      "x-api-token": env.eConsent.token
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw unprocessable(providerMessage(payload, "e-Consent signed document download failed"));
  }

  const arrayBuffer = await response.arrayBuffer();
  const disposition = response.headers.get("content-disposition") || "";
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "econsent-signed-document.pdf";
  const pdf = parseProviderPdfResponse(Buffer.from(arrayBuffer), {
    fallbackFileName: fileName,
    fallbackContentType: response.headers.get("content-type") || "application/pdf",
    fallbackMessage: "e-Consent signed document download failed"
  });

  return {
    fileName: pdf.fileName,
    contentType: pdf.contentType,
    base64: pdf.buffer.toString("base64")
  };
}

export async function downloadEConsentAuditTrail({ documentId }) {
  assertConfigured();
  const cleanDocumentId = String(documentId || "").trim();
  if (!cleanDocumentId) {
    throw unprocessable("e-Consent document id is missing");
  }

  const response = await fetch(endpoint(`/v1/esign/econsent/${encodeURIComponent(cleanDocumentId)}/trail/download`), {
    method: "GET",
    headers: {
      "x-api-token": env.eConsent.token
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw unprocessable(providerMessage(payload, "e-Consent audit trail download failed"));
  }

  const arrayBuffer = await response.arrayBuffer();
  const disposition = response.headers.get("content-disposition") || "";
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `econsent-audit-trail-${cleanDocumentId}.pdf`;
  const pdf = parseProviderPdfResponse(Buffer.from(arrayBuffer), {
    fallbackFileName: fileName,
    fallbackContentType: response.headers.get("content-type") || "application/pdf",
    fallbackMessage: "e-Consent audit trail download failed"
  });

  return {
    fileName: pdf.fileName,
    contentType: pdf.contentType,
    buffer: pdf.buffer
  };
}
