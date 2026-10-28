import { KYC_STATUS, ROLES } from "../../constants/roles.js";
import { forbidden, unprocessable } from "../../utils/http-error.js";
import { isValidAadhaar, isValidPan, maskAadhaar, maskPan, normalizeAadhaar, normalizePan } from "../../utils/identity-validation.js";
import { canReviewKyc } from "../../utils/permissions.js";
import { recordActivity } from "../activity/activity.service.js";
import { getApiPricing } from "../system/system-setting.service.js";
import { User } from "../users/user.model.js";
import { assertWalletHasBalance, debitWalletForApiUsage } from "../wallet/wallet.service.js";
import {
  createLeegalitySign,
  extractLeegalityDocumentId,
  fetchLeegalitySignStatus,
  isReusableLeegalityDraft,
  loadDefaultEsignPdf
} from "./esign-provider.service.js";
import { verifyAadhaarWithProvider, verifyPanWithProvider } from "./kyc-provider.service.js";

export async function submitAadhaar({ user, aadhaarNumber }) {
  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("KYC is not required for this account");
  }

  const normalizedAadhaar = normalizeAadhaar(aadhaarNumber);
  if (!isValidAadhaar(normalizedAadhaar)) {
    throw unprocessable("Enter a valid 12 digit Aadhaar number");
  }

  const providerResponse = await verifyAadhaarWithProvider(normalizedAadhaar);
  const data = providerResponse.data?.data || providerResponse.data || {};
  const safeProviderResponse = sanitizeAadhaarProviderResponse(providerResponse, normalizedAadhaar);
  user.kycStatus = KYC_STATUS.NOT_STARTED;
  user.kyc.aadhaar = {
    status: "verified",
    number: normalizedAadhaar,
    maskedNumber: maskAadhaar(normalizedAadhaar),
    lastDigits: normalizedAadhaar.slice(-4),
    clientId: data.client_id || "",
    ageRange: data.age_range || "",
    state: data.state || "",
    gender: data.gender || "",
    isMobile: Boolean(data.is_mobile),
    mobileLastDigits: data.last_digits || data.mobile_last_digits || data.mobile_number?.slice?.(-4) || "",
    remarks: data.remarks || "",
    providerResponse: safeProviderResponse,
    verifiedAt: new Date()
  };
  user.kyc.esign = {
    status: "",
    phone: "",
    providerReference: "",
    providerResponse: null,
    requestedAt: null,
    signedAt: null
  };
  await user.save();

  await recordActivity({ user, action: "Submitted Aadhaar KYC", service: "KYC" });
  return toKycResponse(user);
}

export async function submitEsign({ user, phone }) {
  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("KYC is not required for this account");
  }

  if (!user.kyc?.aadhaar?.verifiedAt) {
    throw unprocessable("Complete Aadhaar verification first");
  }

  if (!user.kyc?.pan?.verifiedAt) {
    throw unprocessable("Complete PAN verification first");
  }

  if (hasLockedEsignRequest(user)) {
    if (!user.kyc?.esign?.signedAt && user.kyc?.esign?.status !== "verified" && user.kycStatus === KYC_STATUS.PENDING_ADMIN) {
      user.kycStatus = KYC_STATUS.NOT_STARTED;
      user.kyc.submittedAt = null;
      await user.save();
    }
    return toKycResponse(user);
  }

  const cleanPhone = String(phone || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw unprocessable("Enter a valid 10 digit mobile number");
  }

  if (
    isReusableLeegalityDraft({
      providerResponse: user.kyc?.esign?.providerResponse,
      phone: cleanPhone,
      createdAt: user.kyc?.esign?.requestedAt || user.kyc?.esign?.signedAt,
      status: user.kyc?.esign?.status
    })
  ) {
    if (!user.kyc?.esign?.signedAt && user.kyc?.esign?.status !== "verified" && user.kycStatus === KYC_STATUS.PENDING_ADMIN) {
      user.kycStatus = KYC_STATUS.NOT_STARTED;
      user.kyc.submittedAt = null;
      await user.save();
    }
    return toKycResponse(user);
  }

  const billingUser = await getEsignBillingUser();
  const esignFee = await getEsignFee();
  await assertWalletHasBalance({ user: billingUser, connects: esignFee });

  const signerName = getVerifiedPanSignerName(user);
  if (!isValidEsignSignerName(signerName)) {
    throw unprocessable("Enter the correct PAN full name before creating Aadhaar eSign");
  }

  const agreementPdf = await loadDefaultEsignPdf({
    name: signerName,
    email: user.email,
    phone: cleanPhone
  });
  const response = await createLeegalitySign({
    name: signerName,
    email: user.email,
    phone: cleanPhone,
    fileBuffer: agreementPdf.fileBuffer,
    fileName: agreementPdf.fileName
  });
  const providerReference = extractLeegalityDocumentId(response) || `ESIGN_${Date.now()}`;
  await debitWalletForApiUsage({
    user: billingUser,
    service: "ESIGN",
    connects: esignFee,
    reference: providerReference
  });

  user.kycStatus = KYC_STATUS.NOT_STARTED;
  user.kyc.esign = {
    status: "pending",
    phone: cleanPhone,
    providerReference,
    providerResponse: response,
    requestedAt: new Date(),
    signedAt: null
  };

  await user.save();
  await recordActivity({ user, action: "Submitted Aadhaar eSign KYC", service: "KYC" });
  return toKycResponse(user);
}

function normalizeEsignSignerName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getVerifiedPanSignerName(user) {
  const panProvider = user.kyc?.pan?.providerResponse?.data?.data || user.kyc?.pan?.providerResponse?.data || {};
  return normalizeEsignSignerName(panProvider.full_name || panProvider.name || user.kyc?.pan?.name);
}

function isValidEsignSignerName(value) {
  return isValidKycPersonName(value);
}

function isValidKycPersonName(value) {
  const normalized = normalizeEsignSignerName(value);
  return normalized.length >= 3 && !/^test(?:\s+user)?$/i.test(normalized);
}

function hasLockedEsignRequest(user) {
  const status = String(user.kyc?.esign?.status || "").toLowerCase();
  const hasRequest = Boolean(user.kyc?.esign?.providerReference || user.kyc?.esign?.providerResponse);
  if (!hasRequest || ["rejected", "expired", "failed", "cancelled", "canceled"].some((item) => status.includes(item))) {
    return false;
  }
  if (status.includes("verified") || status.includes("signed") || status.includes("completed")) {
    return true;
  }

  const expiresAt = extractEsignExpiry(user.kyc?.esign?.providerResponse);
  if (expiresAt) {
    return expiresAt.getTime() > Date.now();
  }

  const requestedAt = parseEsignDate(user.kyc?.esign?.requestedAt || user.kyc?.esign?.signedAt);
  return requestedAt ? Date.now() - requestedAt.getTime() < 24 * 60 * 60 * 1000 : true;
}

function extractEsignExpiry(response) {
  const value = findFirstValue(response, [
    "expiresAt",
    "expires_at",
    "expiry",
    "expiryDate",
    "expiry_date",
    "expiryAt",
    "expiry_at",
    "validTill",
    "valid_till",
    "validUntil",
    "valid_until",
    "linkExpiresAt",
    "link_expires_at"
  ]);
  return parseEsignDate(value);
}

function parseEsignDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    const parsed = new Date(numeric > 9999999999 ? numeric : numeric * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function refreshEsignStatus({ user }) {
  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("KYC is not required for this account");
  }

  await applyEsignStatusRefresh(user);
  return toKycResponse(user);
}

export async function refreshUserEsignStatus({ admin, userId }) {
  const user = await User.findById(userId);
  if (!user) {
    throw unprocessable("User was not found");
  }
  if (!canReviewKyc(admin, user)) {
    throw forbidden("Only super admin can fetch Aadhaar eSign status");
  }

  await applyEsignStatusRefresh(user);
  await recordActivity({ user: admin, action: `Fetched Aadhaar eSign status for ${user.name}`, service: "KYC" });
  return toKycResponse(user);
}

async function applyEsignStatusRefresh(user) {
  if (!user.kyc?.esign?.providerResponse) {
    throw unprocessable("Create Aadhaar eSign request first");
  }

  const statusResponse = await fetchLeegalitySignStatus({
    documentId: user.kyc?.esign?.providerReference,
    providerResponse: user.kyc?.esign?.providerResponse
  });
  const statusText = normalizeKycEsignStatus(statusResponse);
  const signed = isSignedEsignStatus(statusText);
  const wasPendingAdmin = user.kycStatus === KYC_STATUS.PENDING_ADMIN;

  user.kyc.esign.status = signed ? "verified" : statusText;
  user.kyc.esign.providerResponse = {
    ...(user.kyc.esign.providerResponse || {}),
    statusResponse
  };
  if (signed && !user.kyc.esign.signedAt) {
    user.kyc.esign.signedAt = new Date();
  }

  const hasAcceptedPan = Boolean(user.kyc?.pan?.verifiedAt && user.kyc?.pan?.status !== "rejected");
  if (signed && hasAcceptedPan) {
    user.kycStatus = KYC_STATUS.PENDING_ADMIN;
    user.kyc.submittedAt = new Date();
    user.kyc.reviewedAt = null;
    user.kyc.reviewedBy = null;
    user.kyc.rejectionReason = "";
    user.kyc.rejectionIssues = emptyRejectionIssues();
  } else if (!signed && user.kycStatus === KYC_STATUS.PENDING_ADMIN && !user.kyc?.esign?.signedAt) {
    user.kycStatus = KYC_STATUS.NOT_STARTED;
    user.kyc.submittedAt = null;
  }

  await user.save();
  if (signed && hasAcceptedPan && !wasPendingAdmin) {
    await recordActivity({
      user,
      action: `${user.name} submitted KYC documents for admin review`,
      service: "KYC",
      notifySuperAdmins: true
    });
  }
}

export async function submitPan({ user, panNumber, fullName, dob }) {
  if (user.role === ROLES.SUPER_ADMIN) {
    throw forbidden("KYC is not required for this account");
  }

  if (!user.kyc?.aadhaar?.verifiedAt) {
    throw unprocessable("Complete Aadhaar verification first");
  }

  const normalizedPan = normalizePan(panNumber);
  if (!isValidPan(normalizedPan)) {
    throw unprocessable("Enter a valid PAN number");
  }

  const name = String(fullName || "").trim();
  const dateOfBirth = String(dob || "").trim();
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    throw unprocessable("Full name and date of birth are required for PAN verification");
  }
  if (!isValidKycPersonName(name)) {
    throw unprocessable("Enter the correct PAN full name");
  }

  const providerResponse = await verifyPanWithProvider({ panNumber: normalizedPan, fullName: name, dob: dateOfBirth });
  const data = providerResponse.data?.data || providerResponse.data || {};
  const safeProviderResponse = sanitizePanProviderResponse(providerResponse, normalizedPan);

  const hasSignedEsign = Boolean(user.kyc?.esign?.signedAt && user.kyc?.esign?.status !== "rejected");
  user.kycStatus = hasSignedEsign ? KYC_STATUS.PENDING_ADMIN : KYC_STATUS.NOT_STARTED;
  user.kyc.pan = {
    status: "verified",
    number: normalizedPan,
    maskedNumber: maskPan(normalizedPan),
    clientId: data.client_id || "",
    name: data.full_name || data.name || name,
    dob: data.dob || dateOfBirth,
    category: data.category || "",
    providerResponse: safeProviderResponse,
    verifiedAt: new Date()
  };
  if (user.kycStatus === KYC_STATUS.PENDING_ADMIN) {
    user.kyc.submittedAt = new Date();
    user.kyc.reviewedAt = null;
    user.kyc.reviewedBy = null;
    user.kyc.rejectionReason = "";
    user.kyc.rejectionIssues = emptyRejectionIssues();
  }
  await user.save();

  if (user.kycStatus === KYC_STATUS.PENDING_ADMIN) {
    await recordActivity({
      user,
      action: `${user.name} submitted KYC documents for admin review`,
      service: "KYC",
      notifySuperAdmins: true
    });
  } else {
    await recordActivity({ user, action: "Submitted PAN KYC", service: "KYC" });
  }
  return toKycResponse(user);
}

function sanitizeAadhaarProviderResponse(response, aadhaarNumber) {
  const safe = structuredClone(response || {});
  if (safe.data?.aadhaar_number) {
    safe.data.aadhaar_number = maskAadhaar(aadhaarNumber);
  }
  return safe;
}

function sanitizePanProviderResponse(response, panNumber) {
  const safe = structuredClone(response || {});
  if (safe.data?.pan) {
    safe.data.pan = maskPan(panNumber);
  }
  return safe;
}

export async function approveKyc({ admin, userId }) {
  const user = await User.findById(userId);
  if (!user) {
    throw unprocessable("User was not found");
  }
  if (!canReviewKyc(admin, user)) {
    throw forbidden("Only super admin can approve KYC");
  }

  user.kycStatus = KYC_STATUS.VERIFIED;
  user.kyc.aadhaar.status = "verified";
  user.kyc.esign.status = user.kyc.esign.status || "verified";
  user.kyc.pan.status = "verified";
  user.kyc.reviewedAt = new Date();
  user.kyc.reviewedBy = admin._id;
  user.kyc.rejectionReason = "";
  user.kyc.rejectionIssues = emptyRejectionIssues();
  await user.save();

  await recordActivity({ user: admin, action: `Approved KYC for ${user.name}`, service: "KYC" });
  return toKycResponse(user);
}

export async function rejectKyc({ admin, userId, reason, issues }) {
  const user = await User.findById(userId);
  if (!user) {
    throw unprocessable("User was not found");
  }
  if (!canReviewKyc(admin, user)) {
    throw forbidden("Only super admin can reject KYC");
  }

  const rejectionIssues = normalizeRejectionIssues({ reason, issues });

  user.kycStatus = KYC_STATUS.REJECTED;
  if (rejectionIssues.aadhaar.selected) {
    user.kyc.aadhaar.status = "rejected";
  }
  if (rejectionIssues.pan.selected) {
    user.kyc.pan.status = "rejected";
  }
  if (rejectionIssues.esign.selected) {
    user.kyc.esign.status = "rejected";
  }
  user.kyc.reviewedAt = new Date();
  user.kyc.reviewedBy = admin._id;
  user.kyc.rejectionIssues = rejectionIssues;
  user.kyc.rejectionReason = buildRejectionSummary(rejectionIssues);
  await user.save();

  await recordActivity({ user: admin, action: `Rejected KYC for ${user.name}`, service: "KYC" });
  return toKycResponse(user);
}

export function toKycResponse(user) {
  return {
    kycStatus: user.kycStatus,
    kyc: {
      aadhaar: user.kyc?.aadhaar || {},
      esign: user.kyc?.esign || {},
      pan: user.kyc?.pan || {},
      submittedAt: user.kyc?.submittedAt || null,
      reviewedAt: user.kyc?.reviewedAt || null,
      reviewedBy: user.kyc?.reviewedBy || null,
      rejectionReason: user.kyc?.rejectionReason || "",
      rejectionIssues: user.kyc?.rejectionIssues || emptyRejectionIssues()
    }
  };
}

function maskMobile(phone) {
  const value = String(phone || "").replace(/\D/g, "");
  return value.length >= 4 ? `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : value;
}

function normalizeKycEsignStatus(response) {
  const status = findFirstValue(response, ["status", "documentStatus", "document_status", "signing_status"]);
  const message = findFirstValue(response, ["message", "remarks", "reason"]);
  return `${status} ${message}`.trim() || "pending";
}

function isSignedEsignStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("not signed") || normalized.includes("not completed") || normalized.includes("pending")) {
    return false;
  }
  return normalized.includes("signed") || normalized.includes("completed") || normalized.includes("complete");
}

function findFirstValue(source, keys) {
  if (!source) return "";
  if (Array.isArray(source)) {
    for (const value of source) {
      const nested = findFirstValue(value, keys);
      if (nested) return nested;
    }
    return "";
  }
  if (typeof source !== "object") return "";
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  for (const value of Object.values(source)) {
    const nested = findFirstValue(value, keys);
    if (nested) return nested;
  }
  return "";
}

async function getEsignBillingUser() {
  const superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (!superAdmin) {
    throw unprocessable("Super admin wallet is not configured");
  }
  return superAdmin;
}

async function getEsignFee() {
  const pricing = await getApiPricing();
  const fee = Number(pricing.esign || 40);
  if (!Number.isFinite(fee) || fee <= 0) {
    throw unprocessable("Aadhaar eSign pricing is not configured");
  }
  return fee;
}

function emptyRejectionIssues() {
  return {
    aadhaar: { selected: false, reason: "" },
    pan: { selected: false, reason: "" },
    esign: { selected: false, reason: "" }
  };
}

function normalizeRejectionIssues({ reason, issues }) {
  const fallbackReason = String(reason || "").trim();
  const aadhaarSelected = Boolean(issues?.aadhaar?.selected);
  const panSelected = Boolean(issues?.pan?.selected);
  const esignSelected = Boolean(issues?.esign?.selected);

  if (!aadhaarSelected && !panSelected && !esignSelected) {
    throw unprocessable("Select Aadhaar issue, PAN issue, Aadhaar eSign issue, or multiple issues before rejecting KYC");
  }

  const normalized = {
    aadhaar: {
      selected: aadhaarSelected,
      reason: aadhaarSelected ? String(issues?.aadhaar?.reason || fallbackReason).trim() : ""
    },
    pan: {
      selected: panSelected,
      reason: panSelected ? String(issues?.pan?.reason || fallbackReason).trim() : ""
    },
    esign: {
      selected: esignSelected,
      reason: esignSelected ? String(issues?.esign?.reason || fallbackReason).trim() : ""
    }
  };

  if (normalized.aadhaar.selected && !normalized.aadhaar.reason) {
    throw unprocessable("Enter the Aadhaar rejection reason");
  }

  if (normalized.pan.selected && !normalized.pan.reason) {
    throw unprocessable("Enter the PAN rejection reason");
  }

  if (normalized.esign.selected && !normalized.esign.reason) {
    throw unprocessable("Enter the Aadhaar eSign rejection reason");
  }

  return normalized;
}

function buildRejectionSummary(issues) {
  return [
    issues.aadhaar.selected ? `Aadhaar issue: ${issues.aadhaar.reason}` : "",
    issues.pan.selected ? `PAN issue: ${issues.pan.reason}` : "",
    issues.esign.selected ? `Aadhaar eSign issue: ${issues.esign.reason}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}
