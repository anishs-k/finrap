const BASE_URL = String(process.env.TOTALEKYC_PROVIDER_BASE_URL || "https://live.totalekyc.com/api").replace(/\/$/, "");
const TOKEN = String(process.env.TOTALEKYC_PROVIDER_TOKEN || "").trim();

function providerError(message, request, response = null, httpStatus = 0) {
  const error = new Error(message);
  error.providerAudit = { provider: "Total eKYC", stage: "request", request, response, httpStatus, success: false, error: message };
  error.providerAttempts = [error.providerAudit];
  return error;
}

async function requestTotalEkyc(path, payload) {
  if (!TOKEN) throw providerError("Total eKYC provider credentials are not configured", payload);
  let response;
  let text = "";
  try {
    response = await fetch(`${BASE_URL}/${String(path).replace(/^\//, "")}`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    text = await response.text();
  } catch (error) {
    error.providerAudit = { provider: "Total eKYC", stage: "request", request: payload, response: null, success: false, error: error instanceof Error ? error.message : "Total eKYC request failed" };
    error.providerAttempts = [error.providerAudit];
    throw error;
  }
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text || "Provider returned an invalid response" }; }
  if (!response.ok || String(body?.status || "").toLowerCase() !== "success") {
    throw providerError(String(body?.message || body?.error || `Total eKYC request failed with status ${response.status}`), payload, body, response.status);
  }
  return body;
}

export function fetchMcaCompanyDetailsWithProvider({ cin, remark = "" }) {
  return requestTotalEkyc("corporate/mca/company-details", {
    id_number: String(cin || "").trim().toUpperCase(),
    ...(String(remark || "").trim() ? { remark: String(remark).trim() } : {})
  });
}

export function fetchPrefillWithProvider({ firstName, middleName = "", lastName, mobileNumber, remark = "" }) {
  return requestTotalEkyc("prefill", {
    firstName: String(firstName || "").trim().toUpperCase(),
    middleName: String(middleName || "").trim().toUpperCase(),
    lastName: String(lastName || "").trim().toUpperCase(),
    mobileNumber: String(mobileNumber || "").replace(/\D/g, "").slice(-10),
    ...(String(remark || "").trim() ? { remark: String(remark).trim() } : {})
  });
}
