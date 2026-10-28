import { PUBLIC_API_PERMISSIONS } from "../../constants/permissions.js";
import { ACCOUNT_STATUS, ROLES } from "../../constants/roles.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendOk } from "../../utils/response.js";
import { priceKeyForPermission, pricingPayloadForUser } from "../system/system-setting.service.js";
import { recordActivity } from "../activity/activity.service.js";
import { User } from "../users/user.model.js";
import { Verification } from "../verification/verification.model.js";
import { mapExperianJsonPayload } from "../experian-json-pdf/experian-json-pdf.mapper.js";
import { renderExperianReport } from "../experian-json-pdf/experian-json-pdf.renderer.js";
import { renderTuPdfFromAopayResponse } from "../tu-json-pdf/tu-json-pdf.service.js";
import { Wallet } from "../wallet/wallet.model.js";
import { WalletTransaction } from "../wallet/wallet-transaction.model.js";
import { creditWalletForResellerMargin, debitWalletForApiUsage, refundWalletForApiUsage } from "../wallet/wallet.service.js";

const publicApiPermissionSet = new Set(PUBLIC_API_PERMISSIONS);
const PUBLIC_API_BLOCKED_MESSAGE = "Your account has been blocked. Please contact support.";

export const renderPublicExperianPdf = asyncHandler(async (req, res) => {
  const token = String(req.body.token || "").trim();
  const user = await resolvePublicApiTokenUser({ token, permission: "api.experianPdf" });
  if (!user || user.status === ACCOUNT_STATUS.SUSPENDED) {
    return res.status(403).json({ status: 403, message: user?.status === ACCOUNT_STATUS.SUSPENDED ? PUBLIC_API_BLOCKED_MESSAGE : "Experian PDF permission is required" });
  }

  const { report } = mapExperianJsonPayload(req.body.providerResponse || {});
  const rendered = await renderExperianReport(report);
  return sendOk(res, {
    contentType: "application/pdf",
    fileName: `experian-credit-report-${Date.now()}.pdf`,
    file: rendered.bytes.toString("base64")
  });
});

export const renderPublicTuPdf = asyncHandler(async (req, res) => {
  const token = String(req.body.token || "").trim();
  const user = await resolvePublicApiTokenUser({ token, permission: "api.tuCibilPdf" });
  if (!user || user.status === ACCOUNT_STATUS.SUSPENDED) {
    return res.status(403).json({
      status: 403,
      message: user?.status === ACCOUNT_STATUS.SUSPENDED
        ? PUBLIC_API_BLOCKED_MESSAGE
        : "TU CIBIL PDF permission is required"
    });
  }

  const rendered = await renderTuPdfFromAopayResponse(req.body.providerResponse || {});
  return sendOk(res, {
    contentType: "application/pdf",
    fileName: rendered.fileName,
    file: rendered.bytes.toString("base64")
  });
});

export const authorizePublicApiToken = asyncHandler(async (req, res) => {
  const token = String(req.body.token || "").trim();
  const permission = String(req.body.permission || "").trim();

  if (!token || !publicApiPermissionSet.has(permission)) {
    return sendOk(res, { authorized: false });
  }

  const user = await resolvePublicApiTokenUser({ token, permission });

  if (!user) {
    return sendOk(res, { authorized: false });
  }

  if (user.status === ACCOUNT_STATUS.SUSPENDED) {
    return sendOk(res, {
      authorized: false,
      blocked: true,
      message: PUBLIC_API_BLOCKED_MESSAGE
    });
  }

  sendOk(res, {
    authorized: true,
    customer: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      pricing: pricingPayloadForUser(user).pricing
    }
  });
});

export const reservePublicApiUsage = asyncHandler(async (req, res) => {
  const { user, permission, blocked, message } = await findAuthorizedPublicApiUser(req.body);
  if (blocked) {
    return sendOk(res, { reserved: false, blocked: true, message });
  }
  if (!user) {
    return sendOk(res, { reserved: false, message: "Invalid or missing x-api-token" });
  }

  const reference = String(req.body.reference || "").trim();
  const service = String(req.body.service || permission).trim();
  const priceKey = priceKeyForPermission(permission);
  const pricing = pricingPayloadForUser(user).pricing;
  const connects = Number(pricing[priceKey] || 0);

  if (!reference) {
    return sendOk(res, { reserved: false, message: "Billing reference is required" });
  }

  const updatedUser = await debitWalletForApiUsage({
    user,
    service,
    connects,
    reference
  });

  sendOk(res, {
    reserved: true,
    reference,
    chargedPoints: connects,
    walletBalance: Number((Number(updatedUser.walletBalanceUnits || 0) / 100).toFixed(2))
  });
});

export const refundPublicApiUsage = asyncHandler(async (req, res) => {
  const { user, permission, blocked, message } = await findAuthorizedPublicApiUser(req.body);
  if (blocked) {
    return sendOk(res, { refunded: false, blocked: true, message });
  }
  if (!user) {
    return sendOk(res, { refunded: false, message: "Invalid or missing x-api-token" });
  }

  if (!env.apiRefundsEnabled) {
    return sendOk(res, { refunded: false, disabled: true, message: "API usage refunds are disabled" });
  }

  const reference = String(req.body.reference || "").trim();
  const service = String(req.body.service || permission).trim();
  await refundPublicApiResellerMargins({ user, reference });
  await refundWalletForApiUsage({ user, service, reference });
  sendOk(res, { refunded: true, reference });
});

export const logPublicApiUsage = asyncHandler(async (req, res) => {
  const { user, permission, blocked, message } = await findAuthorizedPublicApiUser(req.body);
  if (blocked) {
    return sendOk(res, { logged: false, blocked: true, message });
  }
  if (!user) {
    return sendOk(res, { logged: false, message: "Invalid or missing x-api-token" });
  }

  const service = normalizePublicApiService(req.body.serviceCode || req.body.service, permission);
  if (!service) {
    return sendOk(res, { logged: false, message: "Unsupported API service" });
  }

  const requestPayload = req.body.request && typeof req.body.request === "object" ? req.body.request : {};
  const provider = req.body.provider && typeof req.body.provider === "object" ? req.body.provider : {};
  const serviceLabel = String(req.body.serviceLabel || req.body.service || permission).trim();
  const success = Boolean(req.body.success);
  const reference = String(req.body.reference || "").trim();
  const identity = buildPublicApiIdentity({ service, serviceLabel, requestPayload, provider });
  const panNumber = publicApiPanNumber(requestPayload);
  const mobileNumber = publicApiMobileNumber(requestPayload);
  const isAsyncEsignService = service === "ESIGN" || service === "ECONSENT";
  const requestName = String(requestPayload.name || identity.customerName || "").trim();
  const requestEmail = String(requestPayload.email || "").trim();
  const requestPhone = String(requestPayload.mobile || requestPayload.phone || "").trim();
  const documentTitle = String(requestPayload.document_title || requestPayload.documentTitle || "").trim();
  const documentId = String(provider.documentId || provider.document_id || "").trim();
  const transactionId = String(provider.transactionId || provider.transaction_id || "").trim();
  const providerReference = String(
    provider.request_uid ||
      provider.requestUid ||
      provider.client_id ||
      provider.clientId ||
      provider.report_id ||
      provider.reportId ||
      provider.documentId ||
      provider.document_id ||
      provider.transactionId ||
      provider.transaction_id ||
      provider.txnid ||
      provider.txn_id ||
      provider.request_id ||
      provider.requestId ||
      reference ||
      ""
  ).trim();

  const verification = await Verification.create({
    service,
    status: success ? (isAsyncEsignService ? "pending" : "verified") : "failed",
    customerName: identity.customerName,
    identifierMasked: identity.identifierMasked,
    panNumber,
    mobileNumber,
    actor: user._id,
    actorRole: user.role,
    providerReference,
    rawProviderStatus: String(provider.message || provider.status || (success ? "Verified" : "Failed")),
    riskBand: String(provider.message || (success ? "Verified" : "Failed")),
    reportFileBase64: String(provider.reportFileBase64 || ""),
    reportContentType: String(provider.reportContentType || ""),
    reportFileName: String(provider.reportFileName || ""),
    details: {
      source: "public-api",
      serviceLabel,
      billingReference: reference,
      requestBody: requestPayload,
      request: maskPublicApiRequest(requestPayload),
      providerResponse: provider.fullResponse ?? provider,
      providerAttempts: Array.isArray(provider.attempts) ? provider.attempts : [],
      ...(panNumber ? { panNumber } : {}),
      ...(mobileNumber ? { mobile: mobileNumber } : {}),
      ...(provider.sourceJson ? { sourceJson: provider.sourceJson } : {}),
      ...(isAsyncEsignService ? {
        providerType: service === "ECONSENT" ? "econsent" : "smartauth",
        name: requestName,
        email: requestEmail,
        phone: mobileNumber || requestPhone,
        recipientName: requestName,
        recipientEmail: requestEmail,
        recipientPhone: mobileNumber || requestPhone,
        documentTitle,
        documentId,
        transactionId,
        signUrl: String(provider.signUrl || provider.sign_url || "").trim(),
        shareUrl: String(provider.shareUrl || provider.share_url || "").trim(),
        signer: {
          name: requestName,
          email: requestEmail,
          mobile: mobileNumber || requestPhone
        }
      } : {}),
      ...((service === "CIBIL" || service === "CIBIL_JSON") && provider.providerType ? {
        providerType: String(provider.providerType)
      } : {}),
      provider: {
        status: provider.status ?? "",
        statusLabel: provider.statusLabel || provider.status_label || "",
        statusCode: provider.statusCode ?? "",
        message: provider.message || "",
        error: typeof provider.error === "string" ? provider.error : "",
        request_uid: providerReference,
        documentId,
        transactionId,
        signUrl: provider.signUrl || provider.sign_url || "",
        shareUrl: provider.shareUrl || provider.share_url || "",
        signedDocumentAvailable: Boolean(provider.signedDocumentAvailable || provider.signed_document_available)
      }
    }
  });

  if (reference && (success || !env.apiRefundsEnabled)) {
    const priceKey = priceKeyForPermission(permission);
    const chargedPrice = Number(pricingPayloadForUser(user).pricing?.[priceKey] || 0);
    await creditPublicApiResellerMargins({
      user,
      permission,
      service,
      chargedPrice,
      reference
    });
  }

  sendOk(res, { logged: true, id: String(verification._id) });
});

function publicApiPanNumber(payload = {}) {
  const candidates = [
    payload.pan,
    payload.pan_card,
    payload.pan_number,
    payload.panNumber,
    payload.PanNumber,
    payload.identifier
  ];
  for (const candidate of candidates) {
    const pan = String(candidate || "").trim().toUpperCase();
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return pan;
  }
  return "";
}

function publicApiMobileNumber(payload = {}) {
  const candidates = [
    payload.mobile,
    payload.mobile_number,
    payload.mobile_no,
    payload.phone,
    payload.MobileNumber
  ];
  for (const candidate of candidates) {
    const digits = String(candidate || "").replace(/\D/g, "");
    const mobile = digits.length > 10 ? digits.slice(-10) : digits;
    if (/^[6-9][0-9]{9}$/.test(mobile)) return mobile;
  }
  return "";
}

async function findAuthorizedPublicApiUser(body = {}) {
  const token = String(body.token || "").trim();
  const permission = String(body.permission || "").trim();

  if (!token || !publicApiPermissionSet.has(permission)) {
    return { user: null, permission };
  }

  const user = await resolvePublicApiTokenUser({ token, permission });
  if (user?.deletedAt) {
    return { user: null, permission, blocked: true, message: "Your account has been deleted. Please contact support." };
  }
  if (user?.status === ACCOUNT_STATUS.SUSPENDED) {
    return { user: null, permission, blocked: true, message: PUBLIC_API_BLOCKED_MESSAGE };
  }

  return { user, permission };
}

async function resolvePublicApiTokenUser({ token, permission }) {
  const users = await User.find({
    publicApiToken: token
  })
    .select("name email role permissions publicApiToken status apiPricing walletBalanceUnits whiteLabelApiDomain deletedAt createdAt")
    .sort({ createdAt: -1 });

  return users.find((user) => user.role === ROLES.SUPER_ADMIN || user.permissions?.includes(permission)) || null;
}

async function creditPublicApiResellerMargins({ user, permission, service, chargedPrice, reference }) {
  const priceKey = priceKeyForPermission(permission);
  if (!priceKey || !reference) return;

  const chain = await resolveUpstreamChain(user);
  if (!chain.length) return;

  let downstreamPrice = Number(chargedPrice || 0);
  for (const parent of chain) {
    const parentPrice = priceForUser(parent, priceKey);
    const margin = roundMoney(downstreamPrice - parentPrice);
    if (margin > 0) {
      const marginReference = `${reference}:margin:${parent._id}`;
      const existingMargin = await WalletTransaction.findOne({
        user: parent._id,
        source: "system",
        reference: marginReference
      });
      if (existingMargin) {
        downstreamPrice = parentPrice;
        continue;
      }
      await creditWalletForResellerMargin({
        user: parent,
        service,
        connects: margin,
        reference: marginReference,
        sourceUserName: user.name
      });
      await recordActivity({
        user: parent,
        action: `Rs. ${margin.toFixed(2)} API margin credited from ${user.name}`,
        service: "Wallet"
      });
    }
    downstreamPrice = parentPrice;
  }
}

async function refundPublicApiResellerMargins({ user, reference }) {
  if (!reference) return;

  const chain = await resolveUpstreamChain(user);
  for (const parent of chain) {
    const marginReference = `${reference}:margin:${parent._id}`;
    const refundReference = `${marginReference}:refund`;
    const existingRefund = await WalletTransaction.findOne({
      user: parent._id,
      source: "system",
      reference: refundReference
    });
    if (existingRefund) continue;

    const marginCredit = await WalletTransaction.findOne({
      user: parent._id,
      type: "credit",
      source: "system",
      reference: marginReference
    });
    if (!marginCredit) continue;

    const refundUnits = Math.abs(Number(marginCredit.connectsDeltaUnits || 0));
    if (!Number.isFinite(refundUnits) || refundUnits <= 0) continue;

    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: parent._id },
      { $inc: { balanceUnits: -refundUnits } },
      { new: true }
    );
    if (!updatedWallet) continue;

    await User.updateOne({ _id: parent._id }, { $set: { walletBalanceUnits: updatedWallet.balanceUnits } });
    await WalletTransaction.create({
      user: parent._id,
      type: "debit",
      source: "system",
      amountPaise: 0,
      connectsDeltaUnits: -refundUnits,
      balanceAfterUnits: updatedWallet.balanceUnits,
      reference: refundReference,
      description: `Reseller margin refund for ${user.name}`
    });
    await recordActivity({
      user: parent,
      action: `Rs. ${(refundUnits / 100).toFixed(2)} API margin reversed for refunded ${user.name} request`,
      service: "Wallet"
    });
  }
}

async function resolveUpstreamChain(user) {
  const chain = [];
  const seen = new Set([String(user?._id || "")]);
  let parentId = user?.parent || user?.invitedBy;

  while (parentId) {
    const parent = await User.findById(parentId).select("name email role parent invitedBy apiPricing walletBalanceUnits status deletedAt").lean();
    if (!parent) break;
    const parentKey = String(parent._id);
    if (seen.has(parentKey)) break;
    seen.add(parentKey);
    if (!parent.deletedAt && parent.role !== ROLES.SUPER_ADMIN) {
      chain.push(parent);
    }
    parentId = parent.parent || parent.invitedBy;
  }

  return chain;
}

function priceForUser(user, priceKey) {
  const pricing = pricingPayloadForUser(user).pricing;
  return Number(pricing?.[priceKey] || 0);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizePublicApiService(service, permission) {
  const value = String(service || "").trim().toUpperCase().replace(/[-\s]+/g, "_");
  const byService = {
    CIBIL: "CIBIL",
    CIBIL_JSON: "CIBIL_JSON",
    EQUIFAX: "EQUIFAX",
    EQUIFAX_JSON: "EQUIFAX_JSON",
    CRIF: "CRIF",
    CRIF_JSON: "CRIF_JSON",
    PAN: "PAN",
    AADHAAR_VALIDATION: "AADHAAR_VALIDATION",
    AADHAAR_OTP: "AADHAAR_OTP",
    UAN_FETCH_BY_PAN: "UAN_FETCH_BY_PAN",
    UAN_PROFILE_DETAILS: "UAN_PROFILE_DETAILS",
    EMPLOYMENT_HISTORY: "EMPLOYMENT_HISTORY",
    EPFO_PASSBOOK: "EPFO_PASSBOOK",
    GSTIN: "GSTIN",
    BANK_VERIFICATION: "BANK_VERIFICATION",
    DRIVING_LICENSE: "DRIVING_LICENSE",
    RC_BASIC: "RC_BASIC",
    EXPERIAN_CREDIT_REPORT: "EXPERIAN_JSON",
    EXPERIAN_JSON: "EXPERIAN_JSON",
    EXPERIAN_PDF: "EXPERIAN_PDF",
    FACE_MATCH: "FACE_MATCH",
    MCA_COMPANY: "MCA_COMPANY",
    PREFILL: "PREFILL",
    ESIGN: "ESIGN",
    ECONSENT: "ECONSENT"
  };
  if (byService[value]) return byService[value];

  return {
    "api.tuCibilPdf": "CIBIL",
    "api.tuCibilJson": "CIBIL_JSON",
    "api.equifaxCibilPdf": "EQUIFAX",
    "api.equifaxCibilJson": "EQUIFAX_JSON",
    "api.crifPdf": "CRIF",
    "api.crifJson": "CRIF_JSON",
    "api.panFullDetail": "PAN",
    "api.aadhaarValidation": "AADHAAR_VALIDATION",
    "api.aadhaarOtp": "AADHAAR_OTP",
    "api.uanFetchByPan": "UAN_FETCH_BY_PAN",
    "api.uanProfileDetails": "UAN_PROFILE_DETAILS",
    "api.employmentHistory": "EMPLOYMENT_HISTORY",
    "api.epfoPassbook": "EPFO_PASSBOOK",
    "api.gstinVerification": "GSTIN",
    "api.bankVerification": "BANK_VERIFICATION",
    "api.drivingLicense": "DRIVING_LICENSE",
    "api.rcBasic": "RC_BASIC",
    "api.experianJson": "EXPERIAN_JSON",
    "api.experianPdf": "EXPERIAN_PDF",
    "api.faceMatch": "FACE_MATCH",
    "api.mcaCompany": "MCA_COMPANY",
    "api.prefill": "PREFILL",
    "api.esign": "ESIGN",
    "api.econsent": "ECONSENT"
  }[permission] || "";
}

function buildPublicApiIdentity({ service, serviceLabel, requestPayload, provider }) {
  const providerData = provider.data && typeof provider.data === "object" ? provider.data : {};
  const providerName = String(
    providerData.name ||
      providerData.full_name ||
      providerData.fullName ||
      providerData.pan_data?.name ||
      providerData.uan_profile_data?.name ||
      providerData.data?.name ||
      ""
  ).trim();
  const customerName = String(requestPayload.name || providerName || serviceLabel || "Public API").trim();
  const identifier =
    service === "AADHAAR_VALIDATION" || service === "AADHAAR_OTP"
      ? requestPayload.aadhaar_number || requestPayload.aadhaarNumber || requestPayload.aadhaar || requestPayload.id_number || requestPayload.idNumber
      : service === "ESIGN" || service === "ECONSENT"
      ? requestPayload.mobile || requestPayload.phone || requestPayload.email
      : service === "CRIF" || service === "EPFO_PASSBOOK"
      ? requestPayload.mobile || requestPayload.mobile_number || requestPayload.pan || requestPayload.pan_number
      : service === "UAN_PROFILE_DETAILS" || service === "EMPLOYMENT_HISTORY"
        ? requestPayload.uan || requestPayload.uan_number
        : service === "RC_BASIC"
          ? requestPayload.registration_number || requestPayload.reg_no || requestPayload.rc_number || requestPayload.registrationNumber
        : service === "DRIVING_LICENSE"
          ? requestPayload.id_number || requestPayload.idNumber || requestPayload.license_number || requestPayload.licenseNumber || requestPayload.driving_license_number || requestPayload.drivingLicenseNumber
        : service === "EXPERIAN_JSON" || service === "EXPERIAN_PDF"
          ? requestPayload.pan || requestPayload.pan_number || requestPayload.pan_card
        : service === "FACE_MATCH"
          ? requestPayload.reference_number || requestPayload.request_id
        : requestPayload.pan_card || requestPayload.pan_number || requestPayload.pan || requestPayload.mobile || requestPayload.mobile_number;

  return {
    customerName,
    identifierMasked: String(identifier || service || "").trim().toUpperCase()
  };
}

function maskPublicApiRequest(requestPayload = {}) {
  const masked = {};
  for (const [key, value] of Object.entries(requestPayload)) {
    const lower = key.toLowerCase();
    if (lower === "otp") {
      masked[key] = "******";
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

function maskIdentifier(value, service) {
  if (!value) return service;
  if (service === "UAN_PROFILE_DETAILS" || service === "EMPLOYMENT_HISTORY") return maskUan(value);
  if (service === "DRIVING_LICENSE") return maskGenericId(value);
  if (service === "RC_BASIC") return maskGenericId(value);
  const clean = String(value || "").trim().toUpperCase();
  if (/^[A-Z]{5}\d{4}[A-Z]$/.test(clean)) return maskPan(clean);
  if (/^\d{12}$/.test(clean)) return maskUan(clean);
  return maskMobile(clean);
}

function maskPan(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (clean.length < 6) return clean || "-";
  return `${clean.slice(0, 2)}XXX${clean.slice(5)}`;
}

function maskMobile(value) {
  const clean = String(value || "").replace(/\D/g, "");
  if (clean.length < 4) return clean || "-";
  return `${"X".repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

function maskUan(value) {
  const clean = String(value || "").replace(/\D/g, "");
  if (clean.length < 4) return clean || "-";
  return `${"X".repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

function maskGenericId(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (clean.length < 6) return clean || "-";
  return `${clean.slice(0, 2)}${"X".repeat(Math.max(0, clean.length - 6))}${clean.slice(-4)}`;
}
