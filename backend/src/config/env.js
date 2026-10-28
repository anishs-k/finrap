import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV || "development";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parseOrigins(value) {
  if (!value) {
    return nodeEnv === "production" ? [] : true;
  }

  const normalized = String(value).trim();
  if (["*", "true"].includes(normalized.toLowerCase())) {
    return true;
  }

  return normalized
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseServers(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
}

const clientOrigins = parseOrigins(process.env.CLIENT_ORIGIN);
const primaryClientOrigin = Array.isArray(clientOrigins) ? clientOrigins[0] : undefined;
const appUrl = process.env.APP_URL || process.env.CLIENT_URL || primaryClientOrigin || "http://localhost:5173";

export const env = {
  backendRoot,
  port: Number(process.env.PORT || 4100),
  host: process.env.HOST || "0.0.0.0",
  mongoUri: process.env.MONGO_URI,
  dnsServers: parseServers(process.env.DNS_SERVERS),
  clientOrigin: clientOrigins,
  clientOrigins,
  appUrl,
  nodeEnv,
  trustProxy: parseBoolean(process.env.TRUST_PROXY, nodeEnv === "production"),
  serveFrontend: parseBoolean(process.env.SERVE_FRONTEND, nodeEnv === "production"),
  frontendDistPath: process.env.FRONTEND_DIST_PATH || "../frontend/dist",
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || "75mb",
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES || 30),
  apiRefundsEnabled: parseBoolean(process.env.API_REFUNDS_ENABLED, false),
  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || "Finrep",
    email: process.env.SUPER_ADMIN_EMAIL || (nodeEnv === "production" ? "" : "dhaarafinance@gmail.com"),
    password: process.env.SUPER_ADMIN_PASSWORD || (nodeEnv === "production" ? "" : "346ryhdj209iwedjsh")
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    secure:
      String(process.env.MAIL_SECURE || "").toLowerCase() === "true" ||
      Number(process.env.MAIL_PORT || 587) === 465
  },
  cashfree: {
    appId: process.env.CASHFREE_APP_ID || "",
    secretKey: process.env.CASHFREE_SECRET_KEY || "",
    apiVersion: process.env.CASHFREE_API_VERSION || "2025-01-01",
    environment: process.env.CASHFREE_ENVIRONMENT || "production",
    currency: process.env.CASHFREE_CURRENCY || "INR"
  },
  billingProvider: {
    baseUrl: process.env.BILLING_API_BASE_URL || "https://service.algebrasoftech.com/billing",
    publicBaseUrl: process.env.BILLING_PUBLIC_BASE_URL || "https://service.algebrasoftech.com/billing",
    token: process.env.BILLING_API_TOKEN || ""
  },
  kycProvider: {
    baseUrl: process.env.KYC_PROVIDER_BASE_URL || "https://apifinrep.avmanagement.in/api/verification",
    token: process.env.KYC_PROVIDER_TOKEN || "",
    authUrl: process.env.KYC_PROVIDER_AUTH_URL || process.env.PROVIDER_AUTH_URL || "https://apifinrep.avmanagement.in/api/auth/login/",
    email: process.env.KYC_PROVIDER_EMAIL || process.env.PROVIDER_EMAIL || "",
    password: process.env.KYC_PROVIDER_PASSWORD || process.env.PROVIDER_PASSWORD || ""
  },
  cibilProvider: {
    baseUrl: process.env.CIBIL_PROVIDER_BASE_URL || "https://console.verifyal.com/vendor-api",
    token: process.env.CIBIL_PROVIDER_TOKEN || "",
    apiKey: process.env.CIBIL_PROVIDER_API_KEY || "",
    authUrl:
      process.env.CIBIL_PROVIDER_AUTH_URL || process.env.PROVIDER_AUTH_URL || "",
    email: process.env.CIBIL_PROVIDER_EMAIL || process.env.KYC_PROVIDER_EMAIL || process.env.PROVIDER_EMAIL || "",
    password: process.env.CIBIL_PROVIDER_PASSWORD || process.env.KYC_PROVIDER_PASSWORD || process.env.PROVIDER_PASSWORD || ""
  },
  befiscTuProvider: {
    baseUrl: String(process.env.BEFISC_TU_PROVIDER_BASE_URL || "https://prod.smartauth.co/TILJ").replace(/\/$/, ""),
    authKey: process.env.BEFISC_TU_PROVIDER_AUTH_KEY || process.env.BEFISC_PAN_PROVIDER_AUTH_KEY || "",
    consentText:
      process.env.BEFISC_TU_CONSENT_TEXT ||
      "We confirm obtaining valid customer consent to access/process their mobile/pan/name data. Consent remains valid, informed, and unwithdrawn."
  },
  smartAuthApi: {
    authKey:
      process.env.SMARTAUTH_API_AUTH_KEY ||
      process.env.BEFISC_TU_PROVIDER_AUTH_KEY ||
      process.env.BEFISC_PAN_PROVIDER_AUTH_KEY ||
      "",
    panUrl: process.env.SMARTAUTH_PAN_URL || "https://prod.smartauth.co/OVK9",
    experianUrl: process.env.SMARTAUTH_EXPERIAN_URL || "https://prod.smartauth.co/JEE4",
    crifUrl: process.env.SMARTAUTH_CRIF_URL || "https://prod.smartauth.co/UICW/v2",
    faceMatchUrl: process.env.BEFISC_FACE_MATCH_URL || "https://face-match.befisc.com",
    faceMatchThreshold: Number(process.env.FACE_MATCH_THRESHOLD || 70),
    experianConsentText:
      process.env.SMARTAUTH_EXPERIAN_CONSENT_TEXT ||
      "We confirm obtaining valid customer consent to access/process their name/mobile data. Consent remains valid, informed, and unwithdrawn.",
    crifConsentText:
      process.env.SMARTAUTH_CRIF_CONSENT_TEXT ||
      "We confirm obtaining valid customer consent to access/process their data. Consent remains valid, informed, and unwithdrawn."
  },
  serviceMaintenance: {
    tuCibilPdfDisabled: parseBoolean(process.env.TU_CIBIL_PDF_DISABLED || process.env.TU_CIBIL_DISABLED),
    tuCibilJsonDisabled: parseBoolean(process.env.TU_CIBIL_JSON_DISABLED || process.env.TU_CIBIL_DISABLED),
    tuCibilDisabledMessage:
      process.env.TU_CIBIL_DISABLED_MESSAGE ||
      "TU CIBIL service is temporarily unavailable. Please try again later."
  },
  aadhaarValidationProvider: {
    baseUrl: process.env.AADHAAR_VALIDATION_PROVIDER_BASE_URL || "https://b2b.payprime.in/api",
    token:
      process.env.PAYPRIME_PROVIDER_TOKEN ||
      process.env.AADHAAR_VALIDATION_PROVIDER_TOKEN ||
      process.env.INCOME_PROVIDER_TOKEN ||
      process.env.PAYPRIME_INCOME_PROVIDER_TOKEN ||
      ""
  },
  aadhaarOtpProvider: {
    // b2b.payprime.in is what produced verified Aadhaar OTPs on the live server (24–26 Oct).
    // Set AADHAAR_OTP_PROVIDER_BASE_URL=https://auth.payprime.in/api to use the URL from PayPrime's doc.
    baseUrl:
      process.env.AADHAAR_OTP_PROVIDER_BASE_URL ||
      process.env.AADHAAR_VALIDATION_PROVIDER_BASE_URL ||
      "https://b2b.payprime.in/api",
    token:
      process.env.AADHAAR_OTP_PROVIDER_TOKEN ||
      process.env.PAYPRIME_PROVIDER_TOKEN ||
      process.env.AADHAAR_VALIDATION_PROVIDER_TOKEN ||
      "",
    headerToken:
      process.env.AADHAAR_OTP_PROVIDER_HEADER_TOKEN ||
      process.env.AADHAAR_OTP_PROVIDER_TOKEN ||
      process.env.PAYPRIME_PROVIDER_TOKEN ||
      process.env.AADHAAR_VALIDATION_PROVIDER_TOKEN ||
      ""
  },
  incomeProvider: {
    baseUrl:
      process.env.INCOME_PROVIDER_BASE_URL ||
      process.env.PAYPRIME_PROVIDER_BASE_URL ||
      process.env.AADHAAR_VALIDATION_PROVIDER_BASE_URL ||
      "https://b2b.payprime.in/api",
    token:
      process.env.PAYPRIME_PROVIDER_TOKEN ||
      process.env.INCOME_PROVIDER_TOKEN ||
      process.env.PAYPRIME_INCOME_PROVIDER_TOKEN ||
      process.env.AADHAAR_VALIDATION_PROVIDER_TOKEN ||
      ""
  },
  satmatProvider: {
    baseUrl:
      process.env.SATMAT_PROVIDER_BASE_URL ||
      "https://satmatapi.com/public/apiPrdtSg",
    memberId: process.env.SATMAT_PROVIDER_MEMBER_ID || "",
    memberPassword: process.env.SATMAT_PROVIDER_MEMBER_PASSWORD || ""
  },
  rcBasicProvider: {
    baseUrl: String(process.env.RC_BASIC_PROVIDER_BASE_URL || "https://verify.rechargkit.biz").replace(/\/$/, ""),
    token: process.env.RC_BASIC_PROVIDER_TOKEN || ""
  },
  indisign: {
    baseUrl: process.env.INDISIGN_API_BASE_URL || "https://api.indisign.co.in/v1",
    apiKey: process.env.INDISIGN_API_KEY || ""
  },
  smartAuthEsign: {
    baseUrl: process.env.SMARTAUTH_ESIGN_BASE_URL || "https://esign-dev.smartauth.co",
    apiKey: process.env.SMARTAUTH_ESIGN_API_KEY || "",
    consentText:
      process.env.SMARTAUTH_ESIGN_CONSENT_TEXT ||
      "We confirm obtaining valid customer consent to access/process their document. Consent remains valid, informed, and unwithdrawn.",
    successRedirectUrl: process.env.SMARTAUTH_ESIGN_SUCCESS_REDIRECT_URL || `${appUrl}/?view=esign&esign_status=success`,
    errorRedirectUrl: process.env.SMARTAUTH_ESIGN_ERROR_REDIRECT_URL || `${appUrl}/?view=esign&esign_status=failed`,
    webhookUrl: process.env.SMARTAUTH_ESIGN_WEBHOOK_URL || "",
    contractExecuterName: process.env.SMARTAUTH_ESIGN_EXECUTER_NAME || "Finrep"
  },
  eConsent: {
    baseUrl: process.env.ECONSENT_API_BASE_URL || "https://econsent.algebrasoftech.com",
    token: process.env.ECONSENT_API_TOKEN || ""
  },
  esignProvider: {
    baseUrl: process.env.ESIGN_PROVIDER_BASE_URL || "https://apifinrep.avmanagement.in/api/esign/leegality",
    statusUrl: process.env.ESIGN_PROVIDER_STATUS_URL || "",
    token: process.env.ESIGN_PROVIDER_TOKEN || process.env.KYC_PROVIDER_TOKEN || "",
    authUrl:
      process.env.ESIGN_PROVIDER_AUTH_URL ||
      process.env.KYC_PROVIDER_AUTH_URL ||
      process.env.PROVIDER_AUTH_URL ||
      "https://apifinrep.avmanagement.in/api/auth/login/",
    email: process.env.ESIGN_PROVIDER_EMAIL || process.env.KYC_PROVIDER_EMAIL || process.env.PROVIDER_EMAIL || "",
    password: process.env.ESIGN_PROVIDER_PASSWORD || process.env.KYC_PROVIDER_PASSWORD || process.env.PROVIDER_PASSWORD || ""
  },
  help: {
    whatsappNumber: process.env.SUPER_ADMIN_WHATSAPP_NUMBER || ""
  }
};

export function assertEnv() {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is required in backend/.env");
  }

  if (env.nodeEnv === "production" && !env.superAdmin.password) {
    throw new Error("SUPER_ADMIN_PASSWORD is required in backend/.env for production");
  }

  if (env.nodeEnv === "production" && !env.superAdmin.email) {
    throw new Error("SUPER_ADMIN_EMAIL is required in backend/.env for production");
  }
}

