import { unprocessable } from "../../utils/http-error.js";
import { trackTiming } from "../../utils/request-timing.js";

const tokenCache = new Map();
const EXPIRY_BUFFER_MS = 60 * 1000;
const FALLBACK_TOKEN_TTL_MS = 10 * 60 * 1000;

export async function providerFetch(providerConfig, label, url, options = {}) {
  const firstResponse = await fetchWithToken(providerConfig, label, url, options);
  if (!canLogin(providerConfig) || ![401, 403].includes(firstResponse.status)) {
    return firstResponse;
  }

  return fetchWithToken(providerConfig, label, url, options, { forceRefresh: true });
}

async function fetchWithToken(providerConfig, label, url, options, tokenOptions = {}) {
  const token = await getProviderAccessToken(providerConfig, label, tokenOptions);
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  return trackTiming("provider", () =>
    fetch(url, {
      ...options,
      headers
    })
  );
}

async function getProviderAccessToken(providerConfig, label, { forceRefresh = false } = {}) {
  if (!canLogin(providerConfig)) {
    if (!providerConfig.token) {
      throw unprocessable(`${label} provider token or login credentials are not configured`);
    }

    return providerConfig.token;
  }

  const cacheKey = getCacheKey(providerConfig);
  const cached = tokenCache.get(cacheKey);
  if (!forceRefresh && cached?.access && cached.expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
    return cached.access;
  }

  const body = await loginToProvider(providerConfig, label);
  const access = extractAccessToken(body);
  if (!access) {
    throw unprocessable(`${label} provider login did not return an access token. Response shape: ${describeShape(body)}`);
  }

  tokenCache.set(cacheKey, {
    access,
    refresh: extractRefreshToken(body),
    expiresAt: getTokenExpiry(access) || Date.now() + FALLBACK_TOKEN_TTL_MS
  });

  return access;
}

async function loginToProvider(providerConfig, label) {
  let response;
  try {
    response = await trackTiming("provider", () =>
      fetch(providerConfig.authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: providerConfig.email,
          password: providerConfig.password
        })
      })
    );
  } catch (error) {
    throw unprocessable(`${label} provider login failed: ${error.message}`);
  }

  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok) {
    const message = body?.message || body?.error || body?.detail || text.slice(0, 180) || "Provider login failed";
    throw unprocessable(`${label} provider login failed: ${message}`);
  }

  return body;
}

function canLogin(providerConfig) {
  return Boolean(providerConfig.authUrl && providerConfig.email && providerConfig.password);
}

function getCacheKey(providerConfig) {
  return `${providerConfig.authUrl}|${providerConfig.email}`;
}

function extractAccessToken(body) {
  return findToken(body, ["access", "accessToken", "access_token", "jwt", "jwtToken", "jwt_token", "bearer", "bearerToken", "bearer_token"]) ||
    findToken(body, ["token", "authToken", "auth_token"]);
}

function extractRefreshToken(body) {
  return findToken(body, ["refresh", "refreshToken", "refresh_token"]) || "";
}

function findToken(source, keys) {
  if (!source) return "";

  if (typeof source === "string") {
    return isTokenValue(source) ? source.trim() : "";
  }

  if (Array.isArray(source)) {
    for (const value of source) {
      const token = findToken(value, keys);
      if (token) return token;
    }
    return "";
  }

  if (typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (isTokenValue(value)) return value.trim();
  }

  for (const value of Object.values(source)) {
    const token = findToken(value, keys);
    if (token) return token;
  }

  return "";
}

function getTokenExpiry(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return 0;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const expirySeconds = Number(payload.exp || 0);
    return expirySeconds > 0 ? expirySeconds * 1000 : 0;
  } catch {
    return 0;
  }
}

function isTokenValue(value) {
  const token = String(value || "").trim();
  return token.length > 20 && !token.includes("*") && !/\s/.test(token);
}

function describeShape(value, depth = 0) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value !== "object") return typeof value;
  if (Array.isArray(value)) return `array(${value.length})`;
  if (depth >= 2) return "object";

  const keys = Object.keys(value);
  if (keys.length === 0) return "empty object";

  return keys
    .slice(0, 8)
    .map((key) => {
      const child = value[key];
      return child && typeof child === "object" && !Array.isArray(child) ? `${key}.{${describeShape(child, depth + 1)}}` : key;
    })
    .join(", ");
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
