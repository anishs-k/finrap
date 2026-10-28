import { DEFAULT_PUBLIC_API_PRICING, ROLE_DEFAULT_PERMISSIONS } from "../constants/permissions.js";

export function toUserDto(user, wallet = null, options = {}) {
  if (!user) return null;
  const plain = typeof user.toObject === "function" ? user.toObject() : user;
  const walletBalanceUnits = wallet?.balanceUnits ?? plain.wallet?.balanceUnits ?? plain.walletBalanceUnits ?? 0;
  const permissions = plain.role === "super_admin"
    ? ROLE_DEFAULT_PERMISSIONS.super_admin
    : Array.isArray(plain.permissions)
    ? [...new Set(plain.permissions)]
    : ROLE_DEFAULT_PERMISSIONS[plain.role] || [];
  const status = plain.status === "active" && plain.invitedBy && !plain.lastLoginAt ? "invited" : plain.status;

  return {
    id: String(plain._id || plain.id),
    name: plain.name,
    email: plain.email,
    roadStreet: plain.roadStreet || "",
    pincode: plain.pincode || "",
    stateCode: plain.stateCode || "",
    gstin: plain.gstin || "",
    pan: plain.pan || "",
    contact: plain.contact || "",
    role: plain.role,
    status,
    planStatus: plain.planStatus,
    kycStatus: plain.kycStatus || "not_started",
    kyc: toKycDto(plain.kyc, options),
    avatarUrl: plain.avatarUrl || "",
    walletKey: wallet?.walletKey || plain.wallet?.walletKey || "",
    walletBalance: Number((walletBalanceUnits / 100).toFixed(2)),
    walletBalanceUnits,
    permissions,
    publicApiToken: options.includePublicApiToken ? plain.publicApiToken || "" : "",
    whiteLabelApiDomain: plain.whiteLabelApiDomain || "",
    issuedPassword: options.includeIssuedPassword ? plain.issuedPassword || "" : "",
    apiPricing: { ...DEFAULT_PUBLIC_API_PRICING, ...(plain.apiPricing || {}) },
    currentPlanId: plain.currentPlan ? String(plain.currentPlan) : null,
    parentId: plain.parent ? String(plain.parent) : null,
    invitedById: plain.invitedBy?._id ? String(plain.invitedBy._id) : plain.invitedBy ? String(plain.invitedBy) : null,
    invitedByName: plain.invitedBy?.name || "",
    invitedByEmail: plain.invitedBy?.email || "",
    invitedByRole: plain.invitedBy?.role || "",
    deletedAt: plain.deletedAt || null,
    createdAt: plain.createdAt
  };
}


export function listToDto(items, mapper) {
  return items.map((item) => mapper(item));
}

function toKycDto(kyc = {}, options = {}) {
  const aadhaarProvider = kyc.aadhaar?.providerResponse?.data?.data || kyc.aadhaar?.providerResponse?.data || {};
  const panProvider = kyc.pan?.providerResponse?.data?.data || kyc.pan?.providerResponse?.data || {};
  const includeSensitiveKyc = Boolean(options.includeSensitiveKyc);
  return {
    aadhaar: {
      status: providerStatusLabel(kyc.aadhaar?.providerResponse) || kyc.aadhaar?.status || "",
      ...(includeSensitiveKyc ? { number: kyc.aadhaar?.number || "" } : {}),
      maskedNumber: kyc.aadhaar?.maskedNumber || "",
      lastDigits: kyc.aadhaar?.lastDigits || "",
      clientId: kyc.aadhaar?.clientId || aadhaarProvider.client_id || "",
      ageRange: kyc.aadhaar?.ageRange || aadhaarProvider.age_range || "",
      state: kyc.aadhaar?.state || aadhaarProvider.state || "",
      gender: kyc.aadhaar?.gender || aadhaarProvider.gender || "",
      isMobile: Boolean(kyc.aadhaar?.isMobile || aadhaarProvider.is_mobile),
      mobileLastDigits: kyc.aadhaar?.mobileLastDigits || aadhaarProvider.last_digits || aadhaarProvider.mobile_last_digits || "",
      remarks: kyc.aadhaar?.remarks || aadhaarProvider.remarks || kyc.aadhaar?.providerResponse?.data?.message_code || "",
      providerResponse: kyc.aadhaar?.providerResponse || null,
      verifiedAt: kyc.aadhaar?.verifiedAt || null
    },
    esign: {
      status: kyc.esign?.status || "",
      phone: kyc.esign?.phone || "",
      providerReference: kyc.esign?.providerReference || "",
      providerResponse: kyc.esign?.providerResponse || null,
      requestedAt: kyc.esign?.requestedAt || null,
      signedAt: kyc.esign?.signedAt || null
    },
    pan: {
      status: providerStatusLabel(kyc.pan?.providerResponse) || kyc.pan?.status || "",
      ...(includeSensitiveKyc ? { number: kyc.pan?.number || "" } : {}),
      maskedNumber: kyc.pan?.maskedNumber || "",
      clientId: kyc.pan?.clientId || panProvider.client_id || "",
      name: kyc.pan?.name || panProvider.full_name || panProvider.name || "",
      dob: kyc.pan?.dob || panProvider.dob || "",
      category: kyc.pan?.category || "",
      providerResponse: kyc.pan?.providerResponse || null,
      verifiedAt: kyc.pan?.verifiedAt || null
    },
    submittedAt: kyc.submittedAt || null,
    reviewedAt: kyc.reviewedAt || null,
    reviewedBy: kyc.reviewedBy ? String(kyc.reviewedBy) : null,
    rejectionReason: kyc.rejectionReason || "",
    rejectionIssues: {
      aadhaar: {
        selected: Boolean(kyc.rejectionIssues?.aadhaar?.selected),
        reason: kyc.rejectionIssues?.aadhaar?.reason || ""
      },
      pan: {
        selected: Boolean(kyc.rejectionIssues?.pan?.selected),
        reason: kyc.rejectionIssues?.pan?.reason || ""
      },
      esign: {
        selected: Boolean(kyc.rejectionIssues?.esign?.selected),
        reason: kyc.rejectionIssues?.esign?.reason || ""
      }
    }
  };
}

function providerStatusLabel(response) {
  if (!response) return "";
  const success = response.data?.success ?? response.success ?? response.status;
  if (success === true) return "verified";
  if (success === false) return response.data?.message || response.message || "unverified";
  return "";
}
