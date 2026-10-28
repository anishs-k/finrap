import { env } from "../../config/env.js";
import { internalServerError, unprocessable } from "../../utils/http-error.js";
import { trackTiming } from "../../utils/request-timing.js";
import { fetchTuJsonWithAopay, generateTuPdfWithAopay } from "../tu-json-pdf/tu-json-pdf.service.js";
import { mapBefiscTuPayload } from "../tu-json-pdf/tu-cibil-befisc-mapper.js";
import { renderTuReport } from "../tu-json-pdf/tu-json-pdf.renderer.js";
import { isSmartAuthApiConfigured, validatePanWithSmartAuth } from "./smartauth-provider.service.js";

const INTERNAL_ADMIN_MESSAGE = "Internal server error. Please contact the administrator.";

// Calls the BEFISC / SmartAuth TU CIBIL provider (TransUnion) and returns the
// parsed provider body. Throws an unprocessable() carrying the provider's own
// message so the real reason reaches the user instead of a generic 500.
async function callBefiscTuProvider({ name, mobile, pan }) {
  const providerRequest = {
    name: String(name || "").trim().toUpperCase(),
    mobile: String(mobile || "").replace(/\D/g, ""),
    pan: String(pan || "").trim().toUpperCase(),
    consent: "Y",
    consent_text: env.befiscTuProvider.consentText
  };

  if (!env.befiscTuProvider.authKey) {
    throw unprocessable("TU CIBIL provider credentials are not configured.");
  }

  let response;
  let responseText = "";
  try {
    response = await trackTiming("provider", () =>
      fetch(env.befiscTuProvider.baseUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          authkey: env.befiscTuProvider.authKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(providerRequest)
      })
    );
    responseText = await response.text();
  } catch (error) {
    const err = unprocessable("TU CIBIL provider is currently unavailable. Please try again.");
    err.providerAudit = {
      provider: "BEFISC TU", stage: "request", request: providerRequest, response: null,
      success: false, error: error instanceof Error ? error.message : "Provider request failed"
    };
    err.providerAttempts = [err.providerAudit];
    throw err;
  }

  const providerBody = parseJson(responseText) || { message: responseText || "Invalid provider response" };
  const providerStatus = Number(providerBody?.status);
  console.log("[befisc-tu-debug] sent:", JSON.stringify({ name: providerRequest.name, mobile: providerRequest.mobile, pan: providerRequest.pan, consentLen: providerRequest.consent_text.length }), "| http:", response.status, "| status:", providerBody?.status, "| message:", providerBody?.message);
  const noRecord = [2, 7].includes(providerStatus);
  const hasReport = providerStatus === 1 && Boolean(providerBody?.result?.cibilData);

  if (!response.ok || !(hasReport || noRecord)) {
    const message = String(providerBody?.message || "TU CIBIL report could not be generated.").trim();
    const err = unprocessable(message);
    err.providerAudit = {
      provider: "BEFISC TU", stage: "response", request: providerRequest, response: providerBody,
      httpStatus: response.status, success: false, error: message
    };
    err.providerAttempts = [err.providerAudit];
    throw err;
  }

  return { providerRequest, providerBody, noRecord, hasReport };
}

export async function generateCibilReportWithProvider({ name, mobile, pan, gender }) {
  const { providerRequest, providerBody, noRecord } = await callBefiscTuProvider({ name, mobile, pan });
  const requestUid = String(providerBody?.txn_id || providerBody?.result?.client_id || `BEFISC_TU_${Date.now()}`);

  if (noRecord) {
    const error = unprocessable("No TU CIBIL credit record was found for the given details.");
    error.providerAudit = {
      provider: "BEFISC TU", stage: "response", request: providerRequest, response: providerBody,
      success: false, error: "No record found"
    };
    error.providerAttempts = [error.providerAudit];
    throw error;
  }

  const { report } = mapBefiscTuPayload(providerBody, { pan, mobile, name });
  const { bytes } = await renderTuReport(report);

  return {
    status: 200,
    message: "Report generated successfully",
    request_uid: requestUid,
    contentType: "application/pdf",
    file: bytes.toString("base64"),
    provider: "BEFISC TU",
    providerRequest,
    sourceJson: providerBody,
    providerAttempts: [
      {
        provider: "BEFISC TU",
        stage: "json-to-pdf",
        request: providerRequest,
        response: { txn_id: providerBody?.txn_id, status: providerBody?.status, message: providerBody?.message },
        success: true
      }
    ]
  };
}

function splitTuCustomerName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";
  return { firstName, lastName: parts.join(" ") || firstName };
}

export async function generateCibilReportDataWithProvider({ name, mobile, pan, gender }) {
  const { providerRequest, providerBody, noRecord } = await callBefiscTuProvider({ name, mobile, pan });
  const requestUid = String(providerBody?.txn_id || providerBody?.result?.client_id || `BEFISC_TU_JSON_${Date.now()}`);

  if (noRecord) {
    const error = unprocessable("No TU CIBIL credit record was found for the given details.");
    error.providerAudit = {
      provider: "BEFISC TU", stage: "response", request: providerRequest, response: providerBody,
      success: false, error: "No record found"
    };
    error.providerAttempts = [error.providerAudit];
    throw error;
  }

  return {
    ...providerBody,
    message: providerBody?.message || "Success",
    request_uid: requestUid,
    contentType: "application/json",
    provider: "BEFISC TU",
    providerRequest,
    sourceJson: providerBody,
    providerAttempts: [
      { provider: "BEFISC TU", stage: "json", request: providerRequest, response: { txn_id: providerBody?.txn_id, status: providerBody?.status }, success: true }
    ]
  };
}

function aopayBusinessError(response) {
  if (String(response?.result_code || "").trim() !== "102") return "";
  return String(response?.message || "").trim() ||
    "Entered mobile number is not linked with Aadhaar. Please use the Aadhaar-linked mobile number.";
}

function providerAttemptFromError(error, provider) {
  return error?.providerAudit || {
    provider,
    stage: "request",
    request: null,
    response: null,
    success: false,
    error: error instanceof Error ? error.message : "Provider request failed"
  };
}

function reportAuditRequest(payload, reportType) {
  return { ...payload, report_type: reportType, consent: "Y" };
}

export async function generateEquifaxReportWithProvider({ name, mobile, pan, gender, dob, address, state, pincode }) {
  return generateCreditReportWithProvider({
    label: "Equifax CIBIL PDF",
    endpointPath: "generate-report",
    reportType: "equifax",
    defaultContentType: "application/pdf",
    payload: { name, mobile, pan, gender, dob, address, state, pincode }
  });
}

export async function generateEquifaxReportDataWithProvider({ name, mobile, pan, gender, dob, address, state, pincode }) {
  return generateCreditReportWithProvider({
    label: "Equifax CIBIL JSON",
    endpointPath: "generate-report-data",
    reportType: "equifax",
    defaultContentType: "application/json",
    payload: { name, mobile, pan, gender, dob, address, state, pincode }
  });
}

export async function generateCrifReportWithProvider({ name, mobile }) {
  return generateCreditReportWithProvider({
    label: "CRIF PDF",
    endpointPath: "generate-report",
    reportType: "crif",
    defaultContentType: "application/pdf",
    payload: { name, mobile }
  });
}

export async function fetchPanFullDetailWithProvider({ panNumber }) {
  const normalizedPan = String(panNumber || "").trim().toUpperCase();
  if (isSmartAuthApiConfigured()) {
    return validatePanWithSmartAuth({ panNumber: normalizedPan });
  }
  try {
    const primary = await fetchPanBasicDetailWithRechargeKit({ panNumber: normalizedPan });
    return {
      ...primary.normalizedResponse,
      provider: "RechargeKit Basic PAN",
      providerAttempts: [
        {
          provider: "RechargeKit Basic PAN",
          stage: "primary",
          request: primary.requestPayload,
          response: primary.providerResponse,
          httpStatus: primary.httpStatus,
          success: true
        }
      ]
    };
  } catch (primaryError) {
    const primaryAttempt = providerAttemptFromError(primaryError, "RechargeKit Basic PAN");
    const error = primaryError instanceof Error ? primaryError : unprocessable(primaryAttempt.error || "PAN provider request failed");
    error.providerAudit = primaryAttempt;
    error.providerAttempts = [primaryAttempt];
    throw error;
  }
}

async function fetchPanBasicDetailWithRechargeKit({ panNumber }) {
  const label = "PAN Full Detail";
  const requestPayload = {
    pan_no: panNumber,
    partner_request_id: `FINREPPAN${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  };
  const providerBaseUrl = String(env.rcBasicProvider?.baseUrl || "https://verify.rechargkit.biz").replace(/\/$/, "");
  const providerToken = String(env.rcBasicProvider?.token || "").trim();

  if (!providerToken) {
    throwProviderError("PAN provider credentials are not configured", {
      provider: "RechargeKit Basic PAN",
      stage: "primary",
      request: requestPayload,
      response: null,
      success: false,
      error: "PAN provider credentials are not configured"
    });
  }

  let response;
  let responseText = "";
  try {
    response = await trackTiming("provider", () =>
      fetch(`${providerBaseUrl}/validation/verifyPANRequest`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${providerToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      })
    );
    responseText = await response.text();
  } catch (error) {
    error.providerAudit = {
      provider: "RechargeKit Basic PAN",
      stage: "primary",
      request: requestPayload,
      response: null,
      success: false,
      error: error instanceof Error ? error.message : "PAN provider request failed"
    };
    throw error;
  }

  const providerResponse = parseJson(responseText);
  const cardData = providerResponse?.cardData && typeof providerResponse.cardData === "object" ? providerResponse.cardData : {};
  const result = cardData?.result && typeof cardData.result === "object" ? cardData.result : {};
  const success = response.ok && Number(providerResponse?.error) === 0 && Number(providerResponse?.status) === 1 && Object.keys(result).length > 0;
  if (!success) {
    const message = resolveErrorMessage(providerResponse, responseText, response.status, label);
    throwProviderError(message, {
      provider: "RechargeKit Basic PAN",
      stage: "primary",
      request: requestPayload,
      response: providerResponse || { raw: responseText },
      httpStatus: response.status,
      success: false,
      error: message
    });
  }

  const requestUid = String(cardData.request_id || providerResponse.orderid || requestPayload.partner_request_id);
  const fullName = String(result.name || "").trim();
  const verifiedPan = String(result.pan || panNumber).trim().toUpperCase();
  const panData = {
    document_type: "PAN",
    document_id: verifiedPan,
    name: fullName,
    pan: verifiedPan,
    status: result.status || "Active",
    name_validated: result.name_validated ?? "",
    name_match: result.name_match ?? false,
    name_match_score: result.name_match_score ?? 0
  };

  return {
    requestPayload,
    providerResponse,
    httpStatus: response.status,
    normalizedResponse: {
      status: 200,
      message: providerResponse.msg || "PAN verified successfully",
      data: {
        client_id: requestUid,
        name: fullName,
        full_name: fullName,
        pan_number: verifiedPan,
        status: panData.status,
        name_validated: panData.name_validated,
        name_match: panData.name_match,
        name_match_score: panData.name_match_score,
        pan_data: panData
      },
      request_uid: requestUid,
      contentType: "application/json",
      provider_response: providerResponse
    }
  };
}

async function fetchPanFullDetailWithVerifyal({ panNumber }) {
  const label = "PAN Full Detail";
  const response = await trackTiming("provider", () =>
    fetch(buildProviderEndpoint("fetch-pan-detailed"), {
      method: "POST",
      headers: providerHeaders(),
      body: buildPanFullDetailPayload({ panNumber })
    })
  );

  const responseText = await response.text();
  const body = parseJson(responseText);
  const message = resolveErrorMessage(body, responseText, response.status, label);

  if (!response.ok) {
    throwProviderError(message);
  }

  if (!body || isFailedProviderBody(body)) {
    throwProviderError(message);
  }

  return {
    ...body,
    message: body.message || "PAN details fetched",
    contentType: body?.content_type || body?.contentType || "application/json"
  };
}

export async function validateAadhaarWithPayprimeProvider({ aadhaarNumber }) {
  if (!env.aadhaarValidationProvider.token) {
    throw unprocessable("Aadhaar validation provider credentials are not configured");
  }

  const response = await trackTiming("provider", () =>
    fetch(buildAadhaarValidationEndpoint("aadhaar/authenticate"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: env.aadhaarValidationProvider.token,
        aadhaar_number: String(aadhaarNumber || "").replace(/\D/g, "")
      })
    })
  );

  const responseText = await response.text();
  const body = parseJson(responseText);
  const message = resolveErrorMessage(body, responseText, response.status, "Aadhaar Validation");

  if (!response.ok) {
    throwProviderError(message);
  }

  const payprimeStatusCode = String(body?.statuscode || "").trim().toUpperCase();
  const payprimeStatus = String(body?.status || "").trim().toUpperCase();
  if (!body || isFailedProviderBody(body) || (payprimeStatusCode && payprimeStatusCode !== "TXN") || (!payprimeStatusCode && payprimeStatus === "ERR")) {
    throwProviderError(message);
  }

  return {
    ...body,
    message: body.message || "Aadhaar Verified Successfully",
    contentType: "application/json"
  };
}

export async function generateAadhaarOtpWithPayprimeProvider({ aadhaarNumber }) {
  if (!env.aadhaarOtpProvider.token) {
    throw unprocessable("Aadhaar OTP provider credentials are not configured");
  }

  const response = await trackTiming("provider", () =>
    fetch(buildAadhaarOtpEndpoint("aadhaar/generate-otp"), {
      method: "POST",
      headers: aadhaarOtpHeaders(),
      body: JSON.stringify({
        token: env.aadhaarOtpProvider.token,
        id_number: String(aadhaarNumber || "").replace(/\D/g, "")
      })
    })
  );

  const responseText = await response.text();
  const body = parseJson(responseText);
  const message = resolveErrorMessage(body, responseText, response.status, "Aadhaar OTP");

  if (!response.ok) {
    throwProviderError(message);
  }

  if (!body || isFailedProviderBody(body) || String(body.statuscode || body.status || "").toUpperCase() === "ERR") {
    throwProviderError(message);
  }

  return {
    ...body,
    message: body.message || "Aadhaar OTP sent successfully",
    contentType: "application/json"
  };
}

export async function verifyAadhaarOtpWithPayprimeProvider({ otp, requestId }) {
  if (!env.aadhaarOtpProvider.token) {
    throw unprocessable("Aadhaar OTP provider credentials are not configured");
  }

  const response = await trackTiming("provider", () =>
    // The PayPrime doc says /aadhaar/submit-otp, but that route returns 404 on their server; /aadhaar/verify-otp exists.
    fetch(buildAadhaarOtpEndpoint("aadhaar/verify-otp"), {
      method: "POST",
      headers: aadhaarOtpHeaders(),
      body: JSON.stringify({
        client_id: String(requestId || "").trim(),
        request_id: String(requestId || "").trim(),
        otp: String(otp || "").replace(/\D/g, ""),
        token: env.aadhaarOtpProvider.token
      })
    })
  );

  const responseText = await response.text();
  const body = parseJson(responseText);
  const message = resolveErrorMessage(body, responseText, response.status, "Aadhaar OTP");

  if (!response.ok) {
    throwProviderError(message);
  }

  if (!body || isFailedProviderBody(body) || String(body.statuscode || body.status || "").toUpperCase() === "ERR") {
    throwProviderError(message);
  }

  return {
    ...body,
    message: body.message || "Aadhaar Verified Successfully",
    contentType: "application/json"
  };
}

export async function fetchUanByPanWithProvider({ panNumber }) {
  return fetchJsonVerificationWithProvider({
    label: "Fetch UAN by PAN",
    endpointPath: "fetch-uan-by-pan",
    payload: { pan_number: String(panNumber || "").trim().toUpperCase() }
  });
}

export async function fetchUanProfileDetailsWithProvider({ uan }) {
  return fetchJsonVerificationWithProvider({
    label: "UAN Profile Details",
    endpointPath: "uan-profile-details",
    payload: { uan: String(uan || "").replace(/\D/g, "") }
  });
}

export async function fetchEmploymentHistoryWithProvider({ uanNumber }) {
  return fetchJsonVerificationWithProvider({
    label: "Employment History",
    endpointPath: "employee-history",
    payload: { uan_number: String(uanNumber || "").replace(/\D/g, "") }
  });
}

export async function fetchEpfoPassbookWithProvider({ mobileNumber, panNumber }) {
  return fetchJsonVerificationWithProvider({
    label: "EPFO Passbook",
    endpointPath: "epfo-passbook",
    payload: {
      mobile_number: String(mobileNumber || "").replace(/\D/g, ""),
      mobile: String(mobileNumber || "").replace(/\D/g, ""),
      pan: String(panNumber || "").trim().toUpperCase(),
      pan_number: String(panNumber || "").trim().toUpperCase(),
      pan_card: String(panNumber || "").trim().toUpperCase()
    }
  });
}

export async function verifyGstinWithPayprimeProvider({ gstin }) {
  return fetchPayprimeIncomeProvider({
    label: "GSTIN Verification",
    endpointPath: "gstin-verification",
    payload: {
      token: incomeProviderToken(),
      id_number: String(gstin || "").trim().toUpperCase(),
      filing_status_get: true
    }
  });
}

export async function verifyBankAccountWithPayprimeProvider({ accountNumber, ifsc }) {
  return fetchPayprimeIncomeProvider({
    label: "Bank Verification",
    endpointPath: "bankverification",
    payload: {
      token: incomeProviderToken(),
      id_number: String(accountNumber || "").replace(/\D/g, ""),
      ifsc: String(ifsc || "").trim().toUpperCase()
    }
  });
}

export async function verifyDrivingLicenseWithPayprimeProvider({ licenseNumber, dob }) {
  return fetchPayprimeIncomeProvider({
    label: "Driving License Verification",
    endpointPath: "driving-license",
    payload: {
      token: incomeProviderToken(),
      id_number: String(licenseNumber || "").trim().toUpperCase(),
      dob: String(dob || "").trim()
    }
  });
}

async function fetchPayprimeIncomeProvider({ label, endpointPath, payload }) {
  if (!incomeProviderToken()) {
    throw unprocessable("Income verification provider credentials are not configured");
  }

  const response = await trackTiming("provider", () =>
    fetch(buildIncomeProviderEndpoint(endpointPath), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );

  const responseText = await response.text();
  const body = parseJson(responseText);
  const message = resolveErrorMessage(body, responseText, response.status, label);

  if (!response.ok) {
    throwProviderError(message);
  }

  if (!body || isFailedProviderBody(body) || String(body.statuscode || body.status || "").toUpperCase() === "ERR") {
    throwProviderError(message);
  }

  return {
    ...body,
    message: body.message || label,
    contentType: "application/json"
  };
}

async function fetchJsonVerificationWithProvider({ label, endpointPath, payload, bodyType = "form" }) {
  const requestHeaders = providerHeaders();
  let requestBody = buildJsonVerificationPayload(payload);
  if (bodyType === "json") {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify({ ...(payload || {}), consent: "Y" });
  }

  const response = await trackTiming("provider", () =>
    fetch(buildProviderEndpoint(endpointPath), {
      method: "POST",
      headers: requestHeaders,
      body: requestBody
    })
  );

  const responseText = await response.text();
  const body = parseJson(responseText);
  const message = resolveErrorMessage(body, responseText, response.status, label);

  if (!response.ok) {
    throwProviderError(message);
  }

  if (!body || isFailedProviderBody(body)) {
    throwProviderError(message);
  }

  return {
    ...body,
    message: body.message || label,
    contentType: body?.content_type || body?.contentType || "application/json"
  };
}

async function generateCreditReportWithProvider({ label, endpointPath, reportType, defaultContentType, payload }) {
  const auditRequest = reportAuditRequest(payload, reportType);
  const response = await trackTiming("provider", () =>
    fetch(buildProviderEndpoint(endpointPath), {
      method: "POST",
      headers: providerHeaders(),
      body: buildReportPayload({ ...payload, reportType })
    })
  );

  const responseContentType = (response.headers.get("content-type") || "").toLowerCase();
  if (responseContentType.includes("application/pdf")) {
    const responseBuffer = await response.arrayBuffer();
    const file = Buffer.from(responseBuffer).toString("base64");
    if (!response.ok || !file.length) {
      const error = unprocessable(`${label} generation failed`);
      error.providerAudit = {
        provider: "Verifyal",
        stage: "response",
        request: auditRequest,
        response: { contentType: responseContentType, bytes: file.length },
        httpStatus: response.status,
        success: false,
        error: `${label} generation failed`
      };
      throw error;
    }
    return {
      success: true,
      message: "Report generated",
      file,
      contentType: "application/pdf"
    };
  }

  const responseText = await response.text();
  const body = parseJson(responseText);
  const message = resolveErrorMessage(body, responseText, response.status, label);

  if (!response.ok) {
    throwProviderError(message, {
      provider: "Verifyal", stage: "response", request: auditRequest, response: body || { raw: responseText }, httpStatus: response.status, success: false, error: message
    });
  }

  if (!body || isFailedProviderBody(body)) {
    throwProviderError(message, {
      provider: "Verifyal", stage: "response", request: auditRequest, response: body || { raw: responseText }, httpStatus: response.status, success: false, error: message
    });
  }

  const fileResult = await resolveFileResult(body);
  return {
    ...body,
    ...fileResult,
    message: body.message || "Report generated",
    contentType: fileResult.contentType || body?.content_type || body?.contentType || defaultContentType
  };
}

function isFailedProviderBody(body) {
  if (!body || typeof body !== "object") return true;
  if (body.success === false) return true;

  const rawStatus = body.status;
  if (rawStatus === undefined || rawStatus === null || rawStatus === "") return false;
  if (rawStatus === false) return true;
  if (rawStatus === true) return false;

  const statusText = String(rawStatus).trim().toLowerCase();
  if (!statusText) return false;

  const numericStatus = Number(statusText);
  if (Number.isFinite(numericStatus)) {
    return numericStatus === 0 || numericStatus >= 400;
  }

  return ["failed", "failure", "error", "rejected", "invalid"].some((value) => statusText.includes(value));
}

function providerHeaders() {
  const headers = {
    Accept: "application/json"
  };

  if (!env.cibilProvider.token || !env.cibilProvider.apiKey) {
    throw unprocessable("Credit report provider credentials are not configured");
  }

  headers.Token = env.cibilProvider.token;
  headers["API-KEY"] = env.cibilProvider.apiKey;

  return headers;
}

function buildProviderEndpoint(endpointPath) {
  return `${String(env.cibilProvider.baseUrl || "").trim().replace(/\/$/, "")}/${endpointPath}`;
}

function buildAadhaarValidationEndpoint(endpointPath) {
  return `${String(env.aadhaarValidationProvider.baseUrl || "").trim().replace(/\/$/, "")}/${endpointPath}`;
}

function buildAadhaarOtpEndpoint(endpointPath) {
  return `${String(env.aadhaarOtpProvider.baseUrl || "").trim().replace(/\/$/, "")}/${endpointPath}`;
}

function aadhaarOtpHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(env.aadhaarOtpProvider.headerToken ? { "X-Auth-Token": env.aadhaarOtpProvider.headerToken } : {})
  };
}

function buildIncomeProviderEndpoint(endpointPath) {
  const baseUrl = String(env.incomeProvider?.baseUrl || "https://b2b.payprime.in/api").trim().replace(/\/$/, "");
  return `${baseUrl}/${endpointPath}`;
}

function incomeProviderToken() {
  return env.incomeProvider?.token || "";
}

function buildReportPayload({ name, mobile, pan, gender, dob, address, state, pincode, reportType }) {
  const formData = new FormData();
  formData.append("name", String(name || "").trim());
  formData.append("mobile", String(mobile || "").replace(/\D/g, ""));
  if (pan) {
    formData.append("pan_card", String(pan || "").trim().toUpperCase());
  }
  if (reportType) {
    formData.append("report_type", reportType);
  }
  if (gender) {
    const normalizedGender = String(gender || "").trim().toLowerCase();
    formData.append("gender", normalizedGender === "female" ? "female" : "male");
  }
  if (dob) {
    formData.append("dob", String(dob || "").trim());
  }
  if (address) {
    formData.append("address", String(address || "").trim());
  }
  if (state) {
    formData.append("state", String(state || "").trim().toUpperCase());
  }
  if (pincode) {
    formData.append("pincode", String(pincode || "").replace(/\D/g, "").slice(0, 6));
  }
  formData.append("consent", "Y");
  return formData;
}

function buildPanFullDetailPayload({ panNumber }) {
  const formData = new FormData();
  formData.append("pan_number", String(panNumber || "").trim().toUpperCase());
  formData.append("consent", "Y");
  return formData;
}

function buildJsonVerificationPayload(payload) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload || {})) {
    if (value !== undefined && value !== null && String(value).trim()) {
      formData.append(key, String(value).trim());
    }
  }
  formData.append("consent", "Y");
  return formData;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resolveErrorMessage(body, responseText, status, label) {
  const parts = [];
  const message =
    trimOrEmpty(body?.message) ||
    trimOrEmpty(body?.error) ||
    extractErrorMap(body?.error) ||
    trimOrEmpty(body?.detail) ||
    flattenDetails(body?.data) ||
    trimOrEmpty(responseText.slice(0, 180));

  const providerStatus = trimOrEmpty(String(body?.status));
  if (providerStatus) {
    parts.push(`Provider status: ${providerStatus}`);
  }
  if (message) {
    parts.push(message);
  }

  const requestUid = trimOrEmpty(body?.request_uid);
  if (requestUid) {
    parts.push(`Request UID: ${requestUid}`);
  }

  if (parts.length === 0) {
    parts.push(`${label} generation failed`);
  }

  const resolved = `${parts.join(" | ")} (status ${status})`;
  return isProviderAccountFundingError(resolved) ? INTERNAL_ADMIN_MESSAGE : resolved;
}

function throwProviderError(message, providerAudit = null) {
  let error;
  if (message === INTERNAL_ADMIN_MESSAGE || isProviderAccountFundingError(message)) {
    error = internalServerError(INTERNAL_ADMIN_MESSAGE);
  } else {
    error = unprocessable(message);
  }
  if (providerAudit) error.providerAudit = providerAudit;
  throw error;
}

function isProviderAccountFundingError(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) return false;
  return [
    "insufficient wallet balance",
    "please recharge to generate report",
    "recharge to generate report",
    "please recharge plan",
    "recharge plan",
    "provider wallet",
    "vendor wallet",
    "wallet balance is low",
    "wallet is empty"
  ].some((needle) => normalized.includes(needle));
}

function extractErrorMap(value) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const entries = Object.entries(value)
    .map(([key, rawValue]) => {
      const normalized = normalizeErrorValue(rawValue);
      return normalized ? `${key}: ${normalized}` : "";
    })
    .filter(Boolean);

  return entries.length ? entries.join(" | ") : "";
}

function flattenDetails(rawDetails) {
  if (!Array.isArray(rawDetails) || !rawDetails.length) {
    return "";
  }

  const details = rawDetails
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const nested = Object.entries(item)
          .map(([key, value]) => {
            const normalized = normalizeErrorValue(value);
            return normalized ? `${key}: ${normalized}` : "";
          })
          .filter(Boolean)
          .join(" | ");
        return nested || "";
      }
      return "";
    })
    .map((item) => item.trim())
    .filter(Boolean);

  return details.length ? `Details: ${details.join(" | ")}` : "";
}

function normalizeErrorValue(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeErrorValue(entry)).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    const nested = Object.entries(value)
      .map(([key, nestedValue]) => {
        const normalized = normalizeErrorValue(nestedValue);
        return normalized ? `${key}: ${normalized}` : "";
      })
      .filter(Boolean)
      .join(" | ");
    return nested || "";
  }
  return "";
}

function trimOrEmpty(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed : "";
}

async function resolveFileResult(source) {
  const candidate = findFileCandidate(source);
  if (!candidate) return { file: "", contentType: "" };

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!trimmed) return { file: "", contentType: "" };

    if (trimmed.startsWith("data:")) {
      const match = trimmed.match(/^data:([^;]+);base64,(.*)$/i);
      if (!match) return { file: "", contentType: "" };
      return { file: match[2], contentType: match[1] || "application/pdf" };
    }

    if (/^https?:\/\//i.test(trimmed)) {
      const reportResponse = await trackTiming("provider", () => fetch(trimmed));
      if (!reportResponse.ok) {
        return { file: "", contentType: "" };
      }

      const reportBuffer = Buffer.from(await reportResponse.arrayBuffer());
      if (!reportBuffer.length) return { file: "", contentType: "" };
      return {
        file: reportBuffer.toString("base64"),
        contentType: reportResponse.headers.get("content-type") || "application/pdf"
      };
    }

    if (trimmed.startsWith("%PDF")) {
      return {
        file: Buffer.from(trimmed, "binary").toString("base64"),
        contentType: "application/pdf"
      };
    }

    if (isLikelyBase64(trimmed)) {
      return { file: trimmed, contentType: "application/pdf" };
    }

    return { file: "", contentType: "" };
  }

  if (candidate instanceof Blob) {
    const reportBuffer = Buffer.from(await candidate.arrayBuffer());
    return {
      file: reportBuffer.toString("base64"),
      contentType: candidate.type || "application/pdf"
    };
  }

  return { file: "", contentType: "" };
}

function isLikelyBase64(value) {
  if (value.length < 80) return false;
  return /^[A-Za-z0-9+/\r\n=]+$/.test(value);
}

function findFileCandidate(source) {
  if (!source || typeof source !== "object") return "";

  const fileKeys = new Set([
    "file",
    "pdf",
    "report",
    "report_file",
    "reportfile",
    "pdf_file",
    "pdffile",
    "document",
    "file_base64",
    "filebase64",
    "base64",
    "pdf_base64",
    "pdfbase64",
    "report_url",
    "reporturl",
    "data",
    "result",
    "output"
  ]);

  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;
    if (fileKeys.has(String(key).toLowerCase())) {
      const candidate = toFileCandidate(value);
      if (candidate) return candidate;
    }
  }

  for (const value of Object.values(source)) {
    const nested = findFileCandidate(value);
    if (nested) return nested;
  }

  return "";
}

function toFileCandidate(value) {
  if (typeof value === "string" || value instanceof Blob) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = toFileCandidate(item);
      if (candidate) return candidate;
    }
  }

  if (value && typeof value === "object") {
    const candidate = findFileCandidate(value);
    if (candidate) return candidate;
  }

  return "";
}
