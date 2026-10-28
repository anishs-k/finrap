import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";

function assertConfigured() {
  if (!env.satmatProvider?.memberId || !env.satmatProvider?.memberPassword) {
    throw unprocessable("Satmat provider credentials are not configured");
  }
}

function providerUrl(path) {
  return `${String(env.satmatProvider.baseUrl || "").replace(/\/+$/, "")}/${path}`;
}

async function parseResponse(response, providerRequest = null) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text || "Satmat returned an invalid response" };
  }
  if (!response.ok) {
    const providerMessage = body?.message || body?.error || `Satmat request failed with status ${response.status}`;
    const message = isProviderWalletFailure(response.status, providerMessage) ? "Bureau down." : providerMessage;
    const auditedRequest = providerRequest && typeof providerRequest === "object"
      ? { ...providerRequest, ...(providerRequest.member_password ? { member_password: "[REDACTED]" } : {}) }
      : providerRequest;
    const providerAttempt = {
      provider: "Satmat",
      stage: "response",
      request: auditedRequest,
      response: body,
      httpStatus: response.status,
      success: false,
      error: providerMessage
    };
    const error = unprocessable(message);
    error.providerAudit = providerAttempt;
    error.providerAttempts = [providerAttempt];
    throw error;
  }
  return body;
}

function isProviderWalletFailure(statusCode, message) {
  const normalized = String(message || "").toLowerCase();
  return Number(statusCode) === 403 && (
    normalized.includes("insufficient wallet") ||
    normalized.includes("wallet balance") ||
    normalized.includes("current balance")
  );
}

function decodeImage(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^data:([^;,]+);base64,(.+)$/s);
  const buffer = Buffer.from(match?.[2] || raw, "base64");
  if (!buffer.length) throw unprocessable("Image file is invalid");
  return { buffer, contentType: match?.[1] || "image/jpeg" };
}

export async function fetchExperianCreditReportWithSatmat(payload) {
  assertConfigured();
  const providerRequest = {
    member_id: env.satmatProvider.memberId,
    member_password: env.satmatProvider.memberPassword,
    ...payload
  };
  const response = await fetch(providerUrl("experian-credit-report"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(providerRequest)
  });
  return parseResponse(response, providerRequest);
}

function splitCustomerName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";
  return { firstName, lastName: parts.join(" ") || firstName };
}

export async function fetchCrifCreditAnalysisWithSatmat({ name, mobile, pan, dob }) {
  assertConfigured();
  const { firstName, lastName } = splitCustomerName(name);
  const referenceNumber = `FINREP_CRIF_${Date.now()}`;
  const providerRequest = {
    member_id: env.satmatProvider.memberId,
    member_password: env.satmatProvider.memberPassword,
    reference_number: referenceNumber,
    mobile_no: mobile,
    first_name: firstName,
    last_name: lastName,
    pan,
    date_of_birth: dob
  };
  const response = await fetch(providerUrl("crif-credit-analysis-api"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(providerRequest)
  });
  const body = await parseResponse(response, providerRequest);
  return {
    ...body,
    message: body?.message || (String(body?.result_code || "") === "103" ? "No Record Found" : "Request Successful"),
    request_uid: body?.request_id || body?.reference_number || referenceNumber,
    provider: "Satmat",
    providerRequest
  };
}

export async function matchFacesWithSatmat({
  referenceNumber,
  selfieFileName,
  selfieFileDataUrl,
  cardImageFileName,
  cardImageFileDataUrl
}) {
  assertConfigured();
  const selfie = decodeImage(selfieFileDataUrl);
  const cardImage = decodeImage(cardImageFileDataUrl);
  const form = new FormData();
  form.append("member_id", env.satmatProvider.memberId);
  form.append("member_password", env.satmatProvider.memberPassword);
  form.append("reference_number", referenceNumber);
  form.append("selfie", new Blob([selfie.buffer], { type: selfie.contentType }), selfieFileName || "selfie.jpg");
  form.append("card_image", new Blob([cardImage.buffer], { type: cardImage.contentType }), cardImageFileName || "card-image.jpg");
  const response = await fetch(providerUrl("face-match"), { method: "POST", body: form });
  return parseResponse(response, {
    member_id: env.satmatProvider.memberId,
    member_password: env.satmatProvider.memberPassword,
    reference_number: referenceNumber,
    selfie_file_name: selfieFileName || "selfie.jpg",
    card_image_file_name: cardImageFileName || "card-image.jpg"
  });
}
