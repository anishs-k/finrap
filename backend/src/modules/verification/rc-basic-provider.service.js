import { env } from "../../config/env.js";
import { serviceUnavailable } from "../../utils/http-error.js";

function partnerRequestId() {
  return `FINREPRC${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function verifyRcBasicWithProvider({ registrationNumber }) {
  if (!env.rcBasicProvider.token) {
    throw serviceUnavailable("Basic RC provider credentials are not configured");
  }

  const requestPayload = {
    reg_no: String(registrationNumber || "").trim().toUpperCase(),
    partner_request_id: partnerRequestId()
  };
  const url = `${env.rcBasicProvider.baseUrl}/validation/v3/rcBasicVerify`;
  let response;
  let responseText = "";

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.rcBasicProvider.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });
    responseText = await response.text();
  } catch (error) {
    error.providerAudit = {
      provider: "RechargeKit Basic RC",
      request: requestPayload,
      response: null,
      success: false,
      error: error instanceof Error ? error.message : "Basic RC provider request failed"
    };
    throw error;
  }

  let providerResponse;
  try {
    providerResponse = responseText ? JSON.parse(responseText) : {};
  } catch {
    providerResponse = { error: 1, status: 0, msg: responseText || "Invalid provider response" };
  }

  return {
    ...providerResponse,
    providerHttpStatus: response.status,
    providerRequest: requestPayload
  };
}
