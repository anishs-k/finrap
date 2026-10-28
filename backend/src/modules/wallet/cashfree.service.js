import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";

function cashfreeBaseUrl() {
  return String(env.cashfree.environment || "").toLowerCase() === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";
}

function cashfreeHeaders() {
  if (!env.cashfree.appId || !env.cashfree.secretKey) {
    throw unprocessable("Cashfree keys are not configured");
  }

  return {
    "Content-Type": "application/json",
    "x-api-version": env.cashfree.apiVersion,
    "x-client-id": env.cashfree.appId,
    "x-client-secret": env.cashfree.secretKey
  };
}

async function cashfreeRequest(path, options = {}) {
  const response = await fetch(`${cashfreeBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...cashfreeHeaders(),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const reason = data?.message || data?.error_description || data?.error || "Cashfree request failed";
    throw unprocessable(`Cashfree request failed: ${reason}`);
  }

  return data;
}

export async function createCashfreeOrder({ orderId, amount, user, returnUrl }) {
  return cashfreeRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: env.cashfree.currency,
      customer_details: {
        customer_id: String(user._id),
        customer_name: user.name || "Finrep User",
        customer_email: user.email || "",
        customer_phone: user.mobile || "9999999999"
      },
      order_meta: {
        return_url: returnUrl
      },
      order_note: "Finrep wallet recharge"
    })
  });
}

export async function getCashfreeOrder(orderId) {
  return cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`, {
    method: "GET"
  });
}
