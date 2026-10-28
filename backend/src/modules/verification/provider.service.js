export async function submitVerificationToProvider({ service }) {
  return {
    status: "pending",
    providerReference: `${service}_${Date.now()}`,
    rawProviderStatus: "queued"
  };
}
