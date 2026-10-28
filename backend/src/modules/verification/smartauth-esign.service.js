import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";

const DEFAULT_SIGNATURE_CONFIG = {
  position: "BOTTOM_RIGHT",
  pages: "all"
};

function configuredBaseUrl() {
  return String(env.smartAuthEsign.baseUrl || "").replace(/\/+$/, "");
}

function assertConfigured() {
  if (!env.smartAuthEsign.apiKey) {
    throw unprocessable("SmartAuth eSign API key is not configured");
  }
}

function endpoint(path) {
  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    throw unprocessable("SmartAuth eSign base URL is not configured");
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
  return String(payload?.message || payload?.error || payload?.status_message || fallback || "").trim();
}

function providerStatus(payload) {
  return payload?.status ?? payload?.statuscode ?? payload?.status_code ?? "";
}

function isFailureStatus(payload) {
  const status = providerStatus(payload);
  const normalized = String(status || "").toLowerCase();
  if (["err", "error", "failed", "false"].includes(normalized)) return true;
  const numeric = Number(status);
  return Number.isFinite(numeric) && numeric >= 3 && numeric !== 200;
}

function isPendingStatus(payload) {
  const status = providerStatus(payload);
  const message = providerMessage(payload, "");
  const normalized = `${status} ${message}`.toLowerCase();
  return normalized.includes("pending") || normalized.includes("processing") || normalized.includes("not signed") || normalized.includes("not completed");
}

function isUploadSuccess(payload) {
  const numeric = Number(providerStatus(payload));
  return numeric === 1 && Boolean(payload?.result?.pdf_url || payload?.pdf_url);
}

function isCreateSuccess(payload) {
  const numeric = Number(providerStatus(payload));
  return [1, 2].includes(numeric) && Boolean(payload?.result?.workflow_url || payload?.workflow_url || payload?.result?.contract_id);
}

function normalizeDataUrl(dataUrl) {
  const value = String(dataUrl || "");
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw unprocessable("Upload a valid PDF document");
  }
  if (!/pdf/i.test(match[1])) {
    throw unprocessable("Only PDF document upload is supported for Aadhaar eSign");
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

function cleanTitle(value, fallback = "Aadhaar eSign Document") {
  return String(value || "").trim() || fallback;
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanRedirectUrl(value, fallback, label) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return fallback;
  try {
    const parsed = new URL(cleanValue);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid redirect protocol");
    }
    return parsed.toString();
  } catch {
    throw unprocessable(`${label} must be a valid http or https URL`);
  }
}

function makeLeadId() {
  return `FINREP_${Date.now()}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

async function uploadDocument({ documentTitle, documentFileName, documentFileDataUrl }) {
  assertConfigured();
  const { contentType, buffer } = normalizeDataUrl(documentFileDataUrl);
  const formData = new FormData();
  formData.append("authkey", env.smartAuthEsign.apiKey);
  formData.append("consent", "Y");
  formData.append("consent_text", env.smartAuthEsign.consentText);
  formData.append("file", new Blob([buffer], { type: contentType }), cleanFileName(documentFileName || documentTitle));

  const response = await fetch(endpoint("/esign/upload"), {
    method: "POST",
    headers: {
      accept: "application/json"
    },
    body: formData
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok || !isUploadSuccess(payload)) {
    throw unprocessable(providerMessage(payload, "SmartAuth document upload failed"));
  }

  return payload;
}

async function createEsignSession({ uploadResponse, name, email, phone, documentTitle, successRedirectUrl, errorRedirectUrl }) {
  assertConfigured();
  const leadId = makeLeadId();
  const pdfUrl = uploadResponse?.result?.pdf_url || uploadResponse?.pdf_url;
  const cleanSuccessRedirectUrl = cleanRedirectUrl(successRedirectUrl, env.smartAuthEsign.successRedirectUrl, "success_redirect_url");
  const cleanErrorRedirectUrl = cleanRedirectUrl(errorRedirectUrl || successRedirectUrl, env.smartAuthEsign.errorRedirectUrl, "error_redirect_url");
  const body = {
    consent: "Y",
    consent_text: env.smartAuthEsign.consentText,
    lead_id: leadId,
    pdf_url: pdfUrl,
    contract_name: cleanTitle(documentTitle),
    contract_executer_name: env.smartAuthEsign.contractExecuterName,
    signer_details: {
      name,
      email,
      mobile: cleanPhone(phone),
      location: "India"
    },
    success_redirect_url: cleanSuccessRedirectUrl,
    error_redirect_url: cleanErrorRedirectUrl,
    signature_config: DEFAULT_SIGNATURE_CONFIG,
    ...(env.smartAuthEsign.webhookUrl ? { webhook_url: env.smartAuthEsign.webhookUrl } : {})
  };

  const response = await fetch(endpoint("/esign/create"), {
    method: "POST",
    headers: {
      authkey: env.smartAuthEsign.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok || isFailureStatus(payload) || !isCreateSuccess(payload)) {
    throw unprocessable(providerMessage(payload, "SmartAuth eSign initiation failed"));
  }

  return { ...payload, lead_id: leadId, request: body };
}

export async function createSmartAuthEsignRequest({ name, email, phone, documentTitle, documentFileName, documentFileDataUrl, successRedirectUrl, errorRedirectUrl }) {
  const title = cleanTitle(documentTitle);
  const fileName = cleanFileName(documentFileName || title);
  const uploadResponse = await uploadDocument({ documentTitle: title, documentFileName: fileName, documentFileDataUrl });
  const createResponse = await createEsignSession({ uploadResponse, name, email, phone, documentTitle: title, successRedirectUrl, errorRedirectUrl });
  const result = createResponse?.result || {};

  return {
    provider: "smartauth",
    documentTitle: title,
    documentFileName: fileName,
    uploadTxnId: uploadResponse?.txn_id || "",
    txnId: createResponse?.txn_id || "",
    leadId: createResponse?.lead_id || "",
    contractId: result.contract_id || "",
    workflowUrl: result.workflow_url || "",
    expiresAt: result.expires_at || uploadResponse?.result?.expires_at || "",
    message: providerMessage(createResponse, "Processing"),
    uploadResponse,
    createResponse
  };
}

export async function fetchSmartAuthSignedDocument({ txnId, contractId }) {
  assertConfigured();
  const params = new URLSearchParams({
    txn_id: String(txnId || ""),
    contract_id: String(contractId || "")
  });
  const response = await fetch(endpoint(`/esign/get-document?${params.toString()}`), {
    method: "GET",
    headers: {
      authkey: env.smartAuthEsign.apiKey
    }
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (isPendingStatus(payload)) {
      return {
        provider: "smartauth",
        status: 2,
        message: providerMessage(payload, "Document signing is pending"),
        result: payload?.result || {},
        rawResponse: payload
      };
    }
    throw unprocessable(providerMessage(payload, "SmartAuth signed document fetch failed"));
  }

  return {
    provider: "smartauth",
    ...payload
  };
}
