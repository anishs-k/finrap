import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";
import { trackTiming } from "../../utils/request-timing.js";

// SmartAuth / BEFISC APIs (Validate PAN, Face Match, Bureau A V2, Bureau C V2).
// All share one authkey header and the same envelope:
// { txn_id, api_name, billable, message, status, result, datetime }.

const SMARTAUTH_ERROR_MESSAGES = {
  401: "Provider authkey missing or invalid",
  402: "Provider account does not have access to this API",
  403: "Provider request limit exceeded",
  404: "Server IP address is not whitelisted with the provider",
  301: "Required parameter or consent missing",
  302: "Provider source is down. Please try again later."
};

export function isSmartAuthApiConfigured() {
  return Boolean(env.smartAuthApi?.authKey);
}

async function callSmartAuth({ label, url, payload, auditPayload = payload, successStatuses = [1] }) {
  if (!isSmartAuthApiConfigured()) {
    throw unprocessable(`${label} provider credentials are not configured`);
  }

  let response;
  let responseText = "";
  try {
    response = await trackTiming("provider", () =>
      fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          authkey: env.smartAuthApi.authKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
    );
    responseText = await response.text();
  } catch (error) {
    throwSmartAuthError(`${label} provider is currently unavailable. Please try again.`, {
      provider: "SmartAuth", stage: "request", request: auditPayload, response: null, success: false,
      error: error instanceof Error ? error.message : "Provider request failed"
    });
  }

  let body;
  try {
    body = responseText ? JSON.parse(responseText) : {};
  } catch {
    body = { message: responseText || "Invalid provider response" };
  }

  const providerStatus = Number(body?.status);
  if (!response.ok || !successStatuses.includes(providerStatus)) {
    const message = String(SMARTAUTH_ERROR_MESSAGES[providerStatus] || body?.message || `${label} request failed`).trim();
    throwSmartAuthError(message, {
      provider: "SmartAuth", stage: "response", request: auditPayload, response: body,
      httpStatus: response.status, success: false, error: message
    });
  }

  return { body, providerStatus, requestPayload: auditPayload };
}

function throwSmartAuthError(message, providerAudit) {
  const error = unprocessable(message);
  error.providerAudit = providerAudit;
  error.providerAttempts = [providerAudit];
  throw error;
}

function stripDataUrl(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^data:[^;,]+;base64,(.+)$/s);
  const base64 = (match?.[1] || raw).replace(/\s+/g, "");
  if (!base64 || !Buffer.from(base64, "base64").length) throw unprocessable("Image file is invalid");
  return base64;
}

// Validate PAN (OVK9). Status 1 = valid, 2 = invalid, 3 = inactive; all three are billable answers.
export async function validatePanWithSmartAuth({ panNumber }) {
  const pan = String(panNumber || "").trim().toUpperCase();
  const { body, providerStatus, requestPayload } = await callSmartAuth({
    label: "PAN",
    url: env.smartAuthApi.panUrl,
    payload: { pan },
    successStatuses: [1, 2, 3]
  });

  const result = body?.result && typeof body.result === "object" ? body.result : {};
  const message = String(result.message || body.message || "").trim();
  const panStatus = providerStatus === 1 ? "Valid" : providerStatus === 3 ? "Inactive" : "Invalid";
  const requestUid = String(body.txn_id || `PAN_${Date.now()}`);

  return {
    status: providerStatus === 1 ? "verified" : "failed",
    message: message || `${panStatus} PAN`,
    data: {
      client_id: requestUid,
      pan_number: String(result.pan || pan).toUpperCase(),
      status: panStatus
    },
    request_uid: requestUid,
    contentType: "application/json",
    provider: "SmartAuth Validate PAN",
    provider_response: body,
    providerAttempts: [
      { provider: "SmartAuth Validate PAN", stage: "primary", request: requestPayload, response: body, success: true }
    ]
  };
}

// Face Match (BEFISC). Image1 = selfie, Image2 = card / target image, both base64.
export async function matchFacesWithBefisc({ referenceNumber, selfieFileDataUrl, cardImageFileDataUrl }) {
  const payload = {
    Image1: stripDataUrl(selfieFileDataUrl),
    Image2: stripDataUrl(cardImageFileDataUrl)
  };
  const { body } = await callSmartAuth({
    label: "Face Match",
    url: env.smartAuthApi.faceMatchUrl,
    payload,
    auditPayload: { reference_number: referenceNumber, Image1: "[base64]", Image2: "[base64]" }
  });

  const result = body?.result && typeof body.result === "object" ? body.result : {};
  // Provider spells it "similarrity"; accept the correct spelling too.
  const similarity = Number(result.similarrity ?? result.similarity);
  const hasScore = Number.isFinite(similarity);

  return {
    ...body,
    reference_number: referenceNumber,
    request_id: body.txn_id || referenceNumber,
    data: {
      confidence: hasScore ? String(similarity) : "",
      same_face: hasScore ? similarity >= env.smartAuthApi.faceMatchThreshold : ""
    },
    provider: "BEFISC Face Match"
  };
}

// Bureau (A) V2 (JEE4) – Experian report keyed on name + mobile. Status 2 = no record.
export async function fetchExperianCreditReportWithSmartAuth({ name, mobile }) {
  const { body, providerStatus, requestPayload } = await callSmartAuth({
    label: "Experian",
    url: env.smartAuthApi.experianUrl,
    payload: {
      name: String(name || "").trim().toUpperCase(),
      mobile: String(mobile || "").replace(/\D/g, ""),
      consent: "Y",
      consent_text: env.smartAuthApi.experianConsentText
    },
    successStatuses: [1, 2]
  });

  // Drop the provider's base64 PDF so it is not stored with every verification record.
  const { pdf_report: _pdfReport, ...result } = body?.result && typeof body.result === "object" ? body.result : {};
  return {
    ...body,
    result,
    message: providerStatus === 2 ? "No Record Found" : body.message || "Experian credit report generated",
    reference_number: body.txn_id,
    provider: "SmartAuth Bureau A",
    providerRequest: requestPayload
  };
}

// Bureau (C) V2 (UICW/v2) – CRIF report keyed on name + mobile. Status 2 = no record.
export async function fetchCrifCreditReportWithSmartAuth({ name, mobile }) {
  const { body, providerStatus, requestPayload } = await callSmartAuth({
    label: "CRIF",
    url: env.smartAuthApi.crifUrl,
    payload: {
      mobile: String(mobile || "").replace(/\D/g, ""),
      name: String(name || "").trim(),
      consent: "Y",
      consent_text: env.smartAuthApi.crifConsentText
    },
    successStatuses: [1, 2]
  });

  return {
    ...body,
    message: providerStatus === 2 ? "No Record Found" : body.message || "Request Successful",
    request_uid: body.txn_id || `FINREP_CRIF_${Date.now()}`,
    provider: "SmartAuth Bureau C",
    providerRequest: requestPayload
  };
}
