import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";
import { providerFetch } from "./provider-auth.service.js";

async function providerPost(path, payload) {
  const response = await providerFetch(env.kycProvider, "KYC", `${env.kycProvider.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false || body?.status === "failed") {
    throw unprocessable(body?.message || "KYC provider verification failed");
  }

  return body;
}

export function verifyAadhaarWithProvider(aadhaarNumber) {
  return providerPost("/aadhaar/", { id_number: aadhaarNumber });
}

export function verifyPanWithProvider({ panNumber, fullName, dob }) {
  return providerPost("/pan/", {
    id_number: panNumber,
    full_name: fullName,
    dob
  });
}
