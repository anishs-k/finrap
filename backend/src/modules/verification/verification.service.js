import { canRunVerification, hasPermission } from "../../utils/permissions.js";
import { forbidden, serviceUnavailable, unprocessable } from "../../utils/http-error.js";
import { parsePagination } from "../../utils/pagination.js";
import { dateSearchClauses, roleSearchValues, searchPattern } from "../../utils/list-search.js";
import { ROLES } from "../../constants/roles.js";
import { env } from "../../config/env.js";
import { isValidAadhaar, isValidPan, maskAadhaar, maskPan, normalizeAadhaar, normalizePan } from "../../utils/identity-validation.js";
import { maskIdentifier } from "../../utils/mask.js";
import { recordActivity } from "../activity/activity.service.js";
import { verifyAadhaarWithProvider } from "../kyc/kyc-provider.service.js";
import { getApiPricing, normalizeApiPricing } from "../system/system-setting.service.js";
import { User } from "../users/user.model.js";
import { assertWalletHasBalance, creditWalletForResellerMargin, debitWalletForApiUsage } from "../wallet/wallet.service.js";
import {
  generateCibilReportDataWithProvider,
  generateCibilReportWithProvider,
  generateCrifReportWithProvider,
  generateEquifaxReportDataWithProvider,
  generateEquifaxReportWithProvider,
  fetchPanFullDetailWithProvider,
  generateAadhaarOtpWithPayprimeProvider,
  validateAadhaarWithPayprimeProvider,
  verifyAadhaarOtpWithPayprimeProvider,
  fetchUanByPanWithProvider,
  fetchUanProfileDetailsWithProvider,
  fetchEmploymentHistoryWithProvider,
  fetchEpfoPassbookWithProvider,
  verifyGstinWithPayprimeProvider,
  verifyBankAccountWithPayprimeProvider,
  verifyDrivingLicenseWithPayprimeProvider
} from "./cibil-provider.service.js";
import {
  fetchCrifCreditAnalysisWithSatmat,
  fetchExperianCreditReportWithSatmat,
  matchFacesWithSatmat
} from "./satmat-provider.service.js";
import {
  fetchCrifCreditReportWithSmartAuth,
  fetchExperianCreditReportWithSmartAuth,
  isSmartAuthApiConfigured,
  matchFacesWithBefisc
} from "./smartauth-provider.service.js";
import { mapExperianJsonPayload } from "../experian-json-pdf/experian-json-pdf.mapper.js";
import { renderExperianReport } from "../experian-json-pdf/experian-json-pdf.renderer.js";
import { verifyRcBasicWithProvider } from "./rc-basic-provider.service.js";
import { fetchMcaCompanyDetailsWithProvider, fetchPrefillWithProvider } from "./totalekyc-provider.service.js";
import { submitVerificationToProvider } from "./provider.service.js";
// IndiSign integration is kept in indisign.service.js for reference, but the active eSign provider is SmartAuth.
import { createSmartAuthEsignRequest, fetchSmartAuthSignedDocument } from "./smartauth-esign.service.js";
import { createEConsentSession, downloadEConsentAuditTrail, downloadEConsentSignedDocument, fetchEConsentStatus, shareEConsentDocument } from "./econsent.service.js";
import { Verification } from "./verification.model.js";

const serviceMap = {
  pan: "PAN",
  "aadhaar-validation": "AADHAAR_VALIDATION",
  aadhaar_validation: "AADHAAR_VALIDATION",
  "aadhaar-otp": "AADHAAR_OTP",
  aadhaar_otp: "AADHAAR_OTP",
  aadhaarotp: "AADHAAR_OTP",
  "uan-fetch-by-pan": "UAN_FETCH_BY_PAN",
  uan_fetch_by_pan: "UAN_FETCH_BY_PAN",
  "uan-profile-details": "UAN_PROFILE_DETAILS",
  uan_profile_details: "UAN_PROFILE_DETAILS",
  "employment-history": "EMPLOYMENT_HISTORY",
  employment_history: "EMPLOYMENT_HISTORY",
  "epfo-passbook": "EPFO_PASSBOOK",
  epfo_passbook: "EPFO_PASSBOOK",
  gst: "GSTIN",
  gstin: "GSTIN",
  "gstin-verification": "GSTIN",
  gstin_verification: "GSTIN",
  bank: "BANK_VERIFICATION",
  "bank-verification": "BANK_VERIFICATION",
  bank_verification: "BANK_VERIFICATION",
  dl: "DRIVING_LICENSE",
  "driving-license": "DRIVING_LICENSE",
  driving_license: "DRIVING_LICENSE",
  drivingLicense: "DRIVING_LICENSE",
  rc: "RC_BASIC",
  "rc-basic": "RC_BASIC",
  rc_basic: "RC_BASIC",
  rcBasic: "RC_BASIC",
  experian: "EXPERIAN_JSON",
  "experian-json": "EXPERIAN_JSON",
  experian_json: "EXPERIAN_JSON",
  "experian-credit-report": "EXPERIAN_JSON",
  experian_credit_report: "EXPERIAN_JSON",
  "experian-pdf": "EXPERIAN_PDF",
  experian_pdf: "EXPERIAN_PDF",
  "face-match": "FACE_MATCH",
  face_match: "FACE_MATCH",
  facematch: "FACE_MATCH",
  mca: "MCA_COMPANY",
  "mca-company": "MCA_COMPANY",
  mca_company: "MCA_COMPANY",
  prefill: "PREFILL",
  aadhaar: "AADHAAR",
  esign: "ESIGN",
  econsent: "ECONSENT",
  "e-consent": "ECONSENT",
  cibil: "CIBIL",
  "tu-cibil-pdf": "CIBIL",
  "tu-cibil-json": "CIBIL_JSON",
  "cibil-json": "CIBIL_JSON",
  cibil_json: "CIBIL_JSON",
  cibiljson: "CIBIL_JSON",
  "equifax-cibil": "EQUIFAX",
  "equifax-cibil-pdf": "EQUIFAX",
  "equifax-cibil-json": "EQUIFAX_JSON",
  equifax: "EQUIFAX",
  equifax_json: "EQUIFAX_JSON",
  crif: "CRIF",
  "crif-pdf": "CRIF",
  "crif-json": "CRIF_JSON",
  crif_json: "CRIF_JSON"
};

const creditReportServices = new Set(["CIBIL", "CIBIL_JSON", "EQUIFAX", "EQUIFAX_JSON", "CRIF", "CRIF_JSON", "EXPERIAN_JSON", "EXPERIAN_PDF", "PREFILL"]);
const billingPriceKeyByService = {
  PAN: "panFullDetail",
  AADHAAR_VALIDATION: "aadhaarValidation",
  AADHAAR_OTP: "aadhaarOtp",
  CIBIL: "tuCibilPdf",
  CIBIL_JSON: "tuCibilJson",
  EQUIFAX: "equifaxCibilPdf",
  EQUIFAX_JSON: "equifaxCibilJson",
  CRIF: "crifPdf",
  CRIF_JSON: "crifJson",
  UAN_FETCH_BY_PAN: "uanFetchByPan",
  UAN_PROFILE_DETAILS: "uanProfileDetails",
  EMPLOYMENT_HISTORY: "employmentHistory",
  EPFO_PASSBOOK: "epfoPassbook",
  GSTIN: "gstinVerification",
  BANK_VERIFICATION: "bankVerification",
  DRIVING_LICENSE: "drivingLicense",
  RC_BASIC: "rcBasic",
  EXPERIAN_JSON: "experianJson",
  EXPERIAN_PDF: "experianPdf",
  FACE_MATCH: "faceMatch",
  MCA_COMPANY: "mcaCompany",
  PREFILL: "prefill",
  ECONSENT: "econsent"
};

const verificationPermissionByService = {
  PAN: { view: "pan.view", generate: "pan.generate" },
  AADHAAR_VALIDATION: { view: "aadhaarValidation.view", generate: "aadhaarValidation.generate" },
  AADHAAR_OTP: { view: "aadhaarOtp.view", generate: "aadhaarOtp.generate" },
  UAN_FETCH_BY_PAN: { view: "uanFetchByPan.view", generate: "uanFetchByPan.generate" },
  UAN_PROFILE_DETAILS: { view: "uanProfileDetails.view", generate: "uanProfileDetails.generate" },
  EMPLOYMENT_HISTORY: { view: "employmentHistory.view", generate: "employmentHistory.generate" },
  EPFO_PASSBOOK: { view: "epfoPassbook.view", generate: "epfoPassbook.generate" },
  GSTIN: { view: "gstin.view", generate: "gstin.generate" },
  BANK_VERIFICATION: { view: "bankVerification.view", generate: "bankVerification.generate" },
  DRIVING_LICENSE: { view: "drivingLicense.view", generate: "drivingLicense.generate" },
  RC_BASIC: { view: "rcBasic.view", generate: "rcBasic.generate" },
  EXPERIAN_JSON: { view: "experianJson.view", generate: "experianJson.generate" },
  EXPERIAN_PDF: { view: "experianPdf.view", generate: "experianPdf.generate" },
  FACE_MATCH: { view: "faceMatch.view", generate: "faceMatch.generate" },
  MCA_COMPANY: { view: "mcaCompany.view", generate: "mcaCompany.generate" },
  PREFILL: { view: "prefill.view", generate: "prefill.generate" },
  ESIGN: { view: "esign.view", generate: "esign.generate" },
  ECONSENT: { view: "econsent.view", generate: "econsent.generate" }
};

const creditReportConfigs = {
  CIBIL: {
    provider: generateCibilReportWithProvider,
    reportType: "tu-cibil-pdf",
    referencePrefix: "TU_CIBIL",
    fileNamePrefix: "tu-cibil-report",
    requiresPan: true,
    requiresGender: true,
    isJson: false
  },
  CIBIL_JSON: {
    provider: generateCibilReportDataWithProvider,
    reportType: "tu-cibil-json",
    referencePrefix: "TU_CIBIL_JSON",
    fileNamePrefix: "tu-cibil-report",
    requiresPan: true,
    requiresGender: true,
    isJson: true
  },
  EQUIFAX: {
    provider: generateEquifaxReportWithProvider,
    reportType: "equifax-cibil-pdf",
    referencePrefix: "EQUIFAX_CIBIL",
    fileNamePrefix: "equifax-cibil-report",
    requiresPan: true,
    requiresGender: true,
    requiresDob: true,
    requiresAddress: true,
    isJson: false
  },
  EQUIFAX_JSON: {
    provider: generateEquifaxReportDataWithProvider,
    reportType: "equifax-cibil-json",
    referencePrefix: "EQUIFAX_CIBIL_JSON",
    fileNamePrefix: "equifax-cibil-report",
    requiresPan: true,
    requiresGender: true,
    requiresDob: true,
    requiresAddress: true,
    isJson: true
  },
  CRIF: {
    provider: generateCrifReportWithProvider,
    reportType: "crif-pdf",
    referencePrefix: "CRIF",
    fileNamePrefix: "crif-report",
    requiresPan: false,
    requiresGender: false,
    isJson: false
  },
  CRIF_JSON: {
    provider: fetchCrifJsonWithActiveProvider,
    reportType: "crif-json",
    referencePrefix: "CRIF_JSON",
    fileNamePrefix: "crif-report",
    requiresPan: true,
    requiresGender: false,
    requiresDob: true,
    isJson: true
  }
};

// SmartAuth (Bureau C V2) is used when its authkey is configured; Satmat stays as the fallback.
function fetchCrifJsonWithActiveProvider(input) {
  return isSmartAuthApiConfigured() ? fetchCrifCreditReportWithSmartAuth(input) : fetchCrifCreditAnalysisWithSatmat(input);
}

export async function listVerifications({ user, service, query = {} }) {
  const normalizedService = serviceMap[String(service || "").toLowerCase()];
  if (!normalizedService) {
    throw forbidden("Unsupported verification service");
  }

  assertCanAccessVerificationService({ user, service: normalizedService });

  const pagination = parsePagination({ ...query, paged: "true" }, { defaultLimit: 10, maxLimit: 50 });
  const allowedActorIds = await resolveVerificationActorIds(user);
  const storedServiceFilter = verificationStoredServiceFilter(normalizedService);
  const filter = await withVerificationSearch(
    Array.isArray(allowedActorIds)
      ? { service: storedServiceFilter, actor: { $in: allowedActorIds } }
      : { service: storedServiceFilter },
    query.search
  );
  const [verifications, total] = await Promise.all([
    Verification.find(filter)
      .select("-reportFileBase64 -details.providerResponse -details.raw -details.statusResponse")
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Verification.countDocuments(filter)
  ]);

  return {
    items: verifications.map((verification) => toVerificationDto(verification, { includeReport: false, includeHeavyDetails: false })),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit))
    }
  };
}

export async function getVerificationDetail({ user, service, verificationId }) {
  const normalizedService = serviceMap[String(service || "").toLowerCase()];
  if (!normalizedService) {
    throw forbidden("Unsupported verification service");
  }

  assertCanAccessVerificationService({ user, service: normalizedService });

  const allowedActorIds = await resolveVerificationActorIds(user);
  const storedServiceFilter = verificationStoredServiceFilter(normalizedService);
  const filter = Array.isArray(allowedActorIds)
    ? { _id: verificationId, service: storedServiceFilter, actor: { $in: allowedActorIds } }
    : { _id: verificationId, service: storedServiceFilter };
  const verification = await Verification.findOne(filter).populate("actor", "name email role");
  if (!verification) {
    throw unprocessable("Verification was not found");
  }

  await persistVerifiedEsignStatus(verification);
  return toVerificationDto(verification, { includeReport: true, includeHeavyDetails: true });
}

function verificationStoredServiceFilter(service) {
  if (service === "EXPERIAN_JSON") {
    return { $in: ["EXPERIAN_JSON", "EXPERIAN_CREDIT_REPORT"] };
  }
  return service;
}

export async function refreshEsignVerificationStatus({ user, verificationId, service = "esign" }) {
  const normalizedService = serviceMap[String(service || "esign").toLowerCase()];
  if (!["ESIGN", "ECONSENT"].includes(normalizedService)) {
    throw forbidden("Unsupported eSign service");
  }

  assertCanAccessVerificationService({ user, service: normalizedService });

  const allowedActorIds = await resolveVerificationActorIds(user);
  const filter = Array.isArray(allowedActorIds)
    ? { _id: verificationId, service: normalizedService, actor: { $in: allowedActorIds } }
    : { _id: verificationId, service: normalizedService };
  const verification = await Verification.findOne(filter).populate("actor", "name email role");
  if (!verification) {
    throw unprocessable("eSign verification was not found");
  }

  if (normalizedService === "ECONSENT") {
    return refreshEConsentVerification(verification);
  }

  const provider = String(verification.details?.provider || "").toLowerCase();
  if (provider && provider !== "smartauth") {
    throw unprocessable("Legacy eSign provider is disabled. Create a new Aadhaar eSign request.");
  }

  const txnId = verification.details?.txnId || verification.details?.createTxnId || verification.providerReference;
  const contractId = verification.details?.contractId;
  if (!txnId || !contractId) {
    throw unprocessable("SmartAuth eSign tracking details are missing");
  }

  const statusResponse = await fetchSmartAuthSignedDocument({ txnId, contractId });
  const providerStatus = smartAuthEsignStatusText(statusResponse);
  const wasVerified = isVerifiedEsignRecord(verification);
  const signedPdfDetails = statusResponse?.result?.signed_pdf_details || statusResponse?.signed_pdf_details || {};
  const signedDocumentUrl = signedPdfDetails?.pdf_url || statusResponse?.downloadUrl || statusResponse?.download_url || "";
  const fetchedVerified = isSignedEsignStatus(providerStatus) || Boolean(signedDocumentUrl);
  const nextVerified = wasVerified || fetchedVerified;
  const existingStatusResponse = verification.details?.statusResponse;
  const nextStatusResponse = wasVerified && !fetchedVerified && existingStatusResponse ? existingStatusResponse : statusResponse;
  const downloadResponse = signedDocumentUrl
    ? {
        downloadUrl: signedDocumentUrl,
        fileName: signedPdfDetails?.file_name || signedPdfDetails?.fileName || "signed-document.pdf",
        expiresAt: signedPdfDetails?.expires_at || signedPdfDetails?.expiresAt || statusResponse?.expires_at || ""
      }
    : verification.details?.downloadResponse;

  verification.status = nextVerified ? "verified" : normalizeProviderStatus(providerStatus);
  verification.rawProviderStatus = nextVerified ? "completed" : providerStatus;
  verification.riskBand = nextVerified ? "Document has been signed" : statusResponse.message || providerStatus;
  verification.details = {
    ...(verification.details || {}),
    status: nextVerified ? "completed" : providerStatus,
    statusResponse: nextStatusResponse,
    ...(downloadResponse ? { downloadResponse } : {})
  };

  await verification.save();
  return toVerificationDto(verification);
}

async function refreshEConsentVerification(verification) {
  const documentId = verification.details?.documentId || verification.providerReference;
  if (!documentId) {
    throw unprocessable("e-Consent document id is missing");
  }

  const statusResponse = await fetchEConsentStatus({ documentId });
  const providerStatus = eConsentStatusText(statusResponse);
  const signed = isSignedEConsentStatus(statusResponse);
  let signedDocument = null;

  if (signed) {
    signedDocument = await downloadEConsentSignedDocument({ documentId });
  }

  verification.status = signed ? "verified" : normalizeProviderStatus(providerStatus);
  verification.rawProviderStatus = signed ? "signed" : providerStatus;
  verification.riskBand = signed ? "Document has been signed" : statusResponse.statusLabel || providerStatus;
  verification.details = {
    ...(verification.details || {}),
    status: signed ? "signed" : providerStatus,
    statusLabel: statusResponse.statusLabel || providerStatus,
    signedDocumentAvailable: Boolean(statusResponse.signedDocumentAvailable || signedDocument),
    auditTrailAvailable: signed,
    signer: statusResponse.signer || verification.details?.signer || {},
    statusTimeline: Array.isArray(statusResponse.statusTimeline) ? statusResponse.statusTimeline : verification.details?.statusTimeline || [],
    statusResponse
  };

  if (signedDocument?.base64) {
    verification.reportFileBase64 = signedDocument.base64;
    verification.reportContentType = signedDocument.contentType || "application/pdf";
    verification.reportFileName = signedDocument.fileName || "econsent-signed-document.pdf";
  }

  await verification.save();
  return toVerificationDto(verification);
}

function eConsentProxyUrls(documentId) {
  const cleanId = encodeURIComponent(String(documentId || "").trim());
  return {
    statusUrl: `https://api.thefinrep.com/v1/esign/econsent/${cleanId}/status`,
    signedDocumentUrl: `https://api.thefinrep.com/v1/esign/econsent/${cleanId}/files/signed`,
    auditTrailUrl: `https://api.thefinrep.com/v1/esign/econsent/${cleanId}/trail/download`
  };
}

export async function downloadEsignAuditTrailForVerification({ user, verificationId, service = "econsent" }) {
  const normalizedService = serviceMap[String(service || "econsent").toLowerCase()];
  if (normalizedService !== "ECONSENT") {
    throw forbidden("Audit trail download is available for e-Consent only");
  }

  assertCanAccessVerificationService({ user, service: normalizedService });

  const allowedActorIds = await resolveVerificationActorIds(user);
  const filter = Array.isArray(allowedActorIds)
    ? { _id: verificationId, service: normalizedService, actor: { $in: allowedActorIds } }
    : { _id: verificationId, service: normalizedService };
  const verification = await Verification.findOne(filter);
  if (!verification) {
    throw unprocessable("e-Consent verification was not found");
  }

  const documentId = verification.details?.documentId || verification.providerReference;
  const trail = await downloadEConsentAuditTrail({ documentId });
  if (!trail?.buffer) {
    throw unprocessable("e-Consent audit trail is not available yet");
  }

  return trail;
}

export async function downloadEsignSignedDocumentForVerification({ user, verificationId, service = "econsent" }) {
  const normalizedService = serviceMap[String(service || "econsent").toLowerCase()];
  if (normalizedService !== "ECONSENT") {
    throw forbidden("Signed document download is available for e-Consent only");
  }

  assertCanAccessVerificationService({ user, service: normalizedService });

  const allowedActorIds = await resolveVerificationActorIds(user);
  const filter = Array.isArray(allowedActorIds)
    ? { _id: verificationId, service: normalizedService, actor: { $in: allowedActorIds } }
    : { _id: verificationId, service: normalizedService };
  const verification = await Verification.findOne(filter);
  if (!verification) {
    throw unprocessable("e-Consent verification was not found");
  }

  const documentId = verification.details?.documentId || verification.providerReference;
  const signedDocument = await downloadEConsentSignedDocument({ documentId });
  if (!signedDocument?.base64) {
    throw unprocessable("e-Consent signed document is not available yet");
  }

  const buffer = Buffer.from(signedDocument.base64, "base64");
  verification.reportFileBase64 = signedDocument.base64;
  verification.reportContentType = signedDocument.contentType || "application/pdf";
  verification.reportFileName = signedDocument.fileName || "econsent-signed-document.pdf";
  verification.details = {
    ...(verification.details || {}),
    signedDocumentAvailable: true
  };
  await verification.save();

  return {
    fileName: verification.reportFileName,
    contentType: verification.reportContentType,
    buffer
  };
}

export async function shareEConsentForVerification({ user, verificationId, service = "econsent" }) {
  const normalizedService = serviceMap[String(service || "econsent").toLowerCase()];
  if (normalizedService !== "ECONSENT") {
    throw forbidden("Share link is available for e-Consent only");
  }

  assertCanAccessVerificationService({ user, service: normalizedService });

  const allowedActorIds = await resolveVerificationActorIds(user);
  const filter = Array.isArray(allowedActorIds)
    ? { _id: verificationId, service: normalizedService, actor: { $in: allowedActorIds } }
    : { _id: verificationId, service: normalizedService };
  const verification = await Verification.findOne(filter);
  if (!verification) {
    throw unprocessable("e-Consent verification was not found");
  }

  const documentId = verification.details?.documentId || verification.providerReference;
  const response = await shareEConsentDocument({ documentId });
  const providerStatus = String(response.statusLabel || response.status || verification.details?.status || "pending").trim();
  const proxyUrls = eConsentProxyUrls(response.documentId || documentId);

  verification.rawProviderStatus = providerStatus;
  verification.riskBand = response.statusLabel || response.message || providerStatus;
  verification.details = {
    ...(verification.details || {}),
    status: providerStatus,
    statusLabel: response.statusLabel || providerStatus,
    signUrl: response.signUrl || verification.details?.signUrl,
    shareUrl: response.shareUrl || response.signUrl || verification.details?.shareUrl || verification.details?.signUrl,
    ...proxyUrls,
    shareResponse: response
  };

  await verification.save();
  return toVerificationDto(verification);
}

export async function createVerification({
  user,
  service,
  customerName,
  firstName,
  middleName,
  lastName,
  remark,
  identifier,
  email,
  dob,
  mobile,
  documentTitle,
  documentFileName,
  documentFileDataUrl,
  successRedirectUrl,
  errorRedirectUrl,
  location,
  date,
  otp,
  requestId,
  gender,
  address,
  state,
  stateCode,
  ifsc,
  pincode,
  selfieFileName,
  selfieFileDataUrl,
  cardImageFileName,
  cardImageFileDataUrl
}) {
  const normalizedService = serviceMap[String(service || "").toLowerCase()];
  if (!normalizedService) {
    throw forbidden("Unsupported verification service");
  }
  assertServiceNotInMaintenance(normalizedService);

  if (normalizedService === "AADHAAR" && user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only super admin can run Aadhaar verification");
  }

  const verificationPermission = verificationPermissionByService[normalizedService];
  if (verificationPermission && !hasPermission(user, verificationPermission.generate)) {
    throw forbidden("Verification permission is required");
  }

  if (creditReportServices.has(normalizedService) && !canRunVerification(user)) {
    throw forbidden("An active API plan is required before running verification requests");
  }

  const billing = await resolveVerificationBilling({ user, service: normalizedService });
  const isAadhaarOtpVerification =
    normalizedService === "AADHAAR_OTP" &&
    Boolean(String(otp || "").trim()) &&
    Boolean(String(requestId || "").trim());
  const shouldBill = normalizedService !== "AADHAAR_OTP" || !isAadhaarOtpVerification;
  const billableFee = shouldBill ? billing.fee : 0;
  if (billableFee > 0) {
    await assertWalletHasBalance({ user, connects: billableFee });
  }

  const providerRequest = {
    service: normalizedService,
    customerName,
    firstName,
    middleName,
    lastName,
    remark,
    identifier,
    email,
    dob,
    mobile,
    documentTitle,
    documentFileName,
    documentFileDataUrl,
    successRedirectUrl,
    errorRedirectUrl,
    location,
    date,
    otp,
    requestId,
    gender,
    address,
    state,
    stateCode,
    ifsc,
    pincode,
    selfieFileName,
    selfieFileDataUrl,
    cardImageFileName,
    cardImageFileDataUrl
  };
  const rawPanNumber = normalizeStoredPan(identifier);
  const rawMobileNumber = normalizeStoredMobile(mobile);

  let provider;
  let debitedUser = user;
  try {
    provider = await submitServiceVerification(providerRequest);
  } catch (error) {
    const providerAudit = error?.providerAudit || null;
    const providerAttempts = Array.isArray(error?.providerAttempts)
      ? error.providerAttempts
      : providerAudit
        ? [providerAudit]
        : [];
    const failureMessage = error instanceof Error ? error.message : "Provider request failed";
    const failureReference = failedProviderReference(providerAudit, normalizedService);
    const providerWasContacted = providerAttempts.length > 0;

    if (billableFee > 0 && providerWasContacted) {
      debitedUser = await debitWalletForApiUsage({
        user,
        service: normalizedService,
        connects: billableFee,
        reference: failureReference
      });
      await creditParentMargin({
        user,
        service: normalizedService,
        fee: billableFee,
        plan: billing.plan,
        reference: failureReference,
        customerName: customerName || `${normalizedService} verification`
      });
    }

    await Verification.create({
      service: normalizedService,
      status: "failed",
      customerName: customerName || `${normalizedService} verification`,
      identifierMasked: String(identifier || "").trim().toUpperCase(),
      panNumber: rawPanNumber,
      mobileNumber: rawMobileNumber,
      actor: user._id,
      actorRole: user.role,
      providerReference: failureReference,
      rawProviderStatus: failureMessage,
      riskBand: failureMessage,
      details: {
        requestBody: auditVerificationRequest(providerRequest),
        providerResponse: providerAudit?.response || { message: failureMessage },
        providerAttempts,
        ...(rawPanNumber ? { panNumber: rawPanNumber } : {}),
        ...(rawMobileNumber ? { mobile: rawMobileNumber } : {})
      }
    });
    throw error;
  }

  debitedUser =
    billableFee > 0
      ? await debitWalletForApiUsage({
          user,
          service: normalizedService,
          connects: billableFee,
          reference: provider.providerReference
        })
      : user;
  await creditParentMargin({
    user,
    service: normalizedService,
    fee: billableFee,
    plan: billing.plan,
    reference: provider.providerReference,
    customerName: provider.customerName || customerName
  });

  const verification = await Verification.create({
    service: normalizedService,
    status: provider.status,
    customerName: provider.customerName || customerName || `${normalizedService} verification`,
    identifierMasked: String(identifier || provider.identifierMasked || "").trim().toUpperCase(),
    panNumber: rawPanNumber,
    mobileNumber: rawMobileNumber,
    score: provider.score ?? null,
    riskBand: provider.riskBand || "Pending",
    actor: user._id,
    actorRole: user.role,
    providerReference: provider.providerReference,
    rawProviderStatus: provider.rawProviderStatus,
    details: {
      requestBody: auditVerificationRequest(providerRequest),
      ...(provider.details || {}),
      ...(rawPanNumber ? { panNumber: rawPanNumber } : {}),
      ...(rawMobileNumber ? { mobile: rawMobileNumber } : {})
    },
    reportFileBase64: provider.reportFileBase64 || "",
    reportContentType: provider.reportContentType || "",
    reportFileName: provider.reportFileName || ""
  });

  await recordActivity({
    user: debitedUser,
    action: `${normalizedService} verification submitted for ${provider.customerName || customerName}`,
    service: normalizedService
  });

  return toVerificationDto(verification);
}

async function submitServiceVerification({
  service,
  customerName,
  firstName,
  middleName,
  lastName,
  remark,
  identifier,
  email,
  dob,
  mobile,
  documentTitle,
  documentFileName,
  documentFileDataUrl,
  successRedirectUrl,
  errorRedirectUrl,
  location,
  date,
  otp,
  requestId,
  gender,
  address,
  state,
  stateCode,
  ifsc,
  pincode,
  selfieFileName,
  selfieFileDataUrl,
  cardImageFileName,
  cardImageFileDataUrl,
  requestReference
}) {
  if (service === "AADHAAR") {
    const aadhaarNumber = normalizeAadhaar(identifier);
    if (!isValidAadhaar(aadhaarNumber)) {
      throw unprocessable("Enter a valid 12 digit Aadhaar number");
    }

    const response = await verifyAadhaarWithProvider(aadhaarNumber);
    const data = response.data || {};
    return {
      status: "verified",
      customerName: "Aadhaar verification",
      providerReference: data.client_id || `AADHAAR_${Date.now()}`,
      rawProviderStatus: response.status || "verified",
      identifierMasked: aadhaarNumber,
      riskBand: firstValue(data, ["state", "status", "remarks"]) || "Verified",
      details: {
        status: "verified",
        clientId: data.client_id || "",
        aadhaarNumber,
        lastMobileDigits:
          firstValue(data, [
            "mobile_last_digits",
            "mobileLastDigits",
            "mobile_last_digit",
            "last_mobile_digits",
            "last_digits",
            "lastDigits",
            "mobile_digits",
            "mobileDigits"
          ]) || lastDigits(firstValue(data, ["mobile_number", "mobileNumber", "mobile", "phone", "phone_number"])),
        ageRange: firstValue(data, ["age_range", "ageRange", "age"]) || "",
        state: firstValue(data, ["state"]) || "",
        statusDetail: firstValue(data, ["status", "remarks", "message", "reason"]) || "Verified",
        gender: firstValue(data, ["gender"]) || "",
        remarks: firstValue(data, ["remarks", "message", "reason"]) || "",
        raw: response
      }
    };
  }

  if (service === "PAN") {
    const panNumber = normalizePan(identifier);
    if (!isValidPan(panNumber)) {
      throw unprocessable("Enter a valid PAN number");
    }

    const response = await fetchPanFullDetailWithProvider({ panNumber });
    const data = response.data || {};
    const providerStatus = normalizeProviderStatus(
      firstValue(response, ["status", "verification_status", "result_status"]) ||
        firstValue(data, ["status", "verification_status", "result_status"])
    );
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || firstValue(data, ["message", "remarks", "reason"]);
    return {
      status: providerStatus,
      customerName,
      providerReference: data.client_id || `PAN_${Date.now()}`,
      rawProviderStatus: response.status || "verified",
      identifierMasked: panNumber,
      riskBand: providerMessage || data.category || providerStatus,
      details: {
        status: providerMessage || providerStatus,
        clientId: firstValue(response, ["client_id", "clientId", "request_uid"]) || "",
        fullName: firstValue(response, ["name", "full_name", "fullName", "pan_name"]) || customerName,
        panNumber,
        category: firstValue(response, ["category", "pan_category", "panCategory"]) || "",
        providerResponse: response
      }
    };
  }

  if (service === "AADHAAR_VALIDATION") {
    const aadhaarNumber = normalizeAadhaar(identifier);
    if (!isValidAadhaar(aadhaarNumber)) {
      throw unprocessable("Enter a valid 12 digit Aadhaar number");
    }

    const response = await validateAadhaarWithPayprimeProvider({ aadhaarNumber });
    const responseData = response.data && typeof response.data === "object" ? response.data : {};
    const data = responseData.data && typeof responseData.data === "object" ? responseData.data : responseData;
    const providerStatus = normalizeProviderStatus(firstValue(response, ["statuscode", "status"]) || firstValue(data, ["status"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || firstValue(data, ["message", "status"]) || providerStatus;
    const clientId = firstValue(response, ["txnid", "txn_id", "request_id", "requestId"]) || `AADHAAR_VALIDATION_${Date.now()}`;

    return {
      status: providerStatus,
      customerName: customerName || "Aadhaar Validation",
      providerReference: clientId,
      rawProviderStatus: response.statuscode || response.status || providerStatus,
      identifierMasked: aadhaarNumber,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        statusDetail: firstValue(data, ["status"]) || providerMessage,
        clientId,
        aadhaarNumber,
        state: firstValue(data, ["state"]) || "",
        ageRange: firstValue(data, ["age_range", "ageRange"]) || "",
        gender: firstValue(data, ["gender"]) || "",
        maskedMobileNumber: firstValue(data, ["masked_mobile_number", "maskedMobileNumber"]) || "",
        aadhaarStatusCode: firstValue(data, ["aadhaar_status_code", "aadhaarStatusCode"]) || "",
        providerResponse: response
      }
    };
  }

  if (service === "MCA_COMPANY") {
    const cin = String(identifier || "").trim().toUpperCase();
    if (!/^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cin)) throw unprocessable("Enter a valid 21 character CIN");
    const response = await fetchMcaCompanyDetailsWithProvider({ cin, remark });
    const data = response.data && typeof response.data === "object" ? response.data : {};
    const companyDetails = data.details && typeof data.details === "object" ? data.details : {};
    const companyInfo = companyDetails.company_info && typeof companyDetails.company_info === "object" ? companyDetails.company_info : {};
    const directors = Array.isArray(companyDetails.directors) ? companyDetails.directors : [];
    const charges = Array.isArray(companyDetails.charges) ? companyDetails.charges : [];
    const reference = firstValue(response, ["transaction_id", "transactionId"]) || firstValue(data, ["client_id", "clientId"]) || `MCA_${Date.now()}`;
    const companyName = firstValue(data, ["company_name", "companyName"]) || firstValue(companyInfo, ["company_name", "companyName"]) || customerName || "MCA Company";
    return {
      status: "verified",
      customerName: companyName,
      providerReference: reference,
      rawProviderStatus: response.status || "success",
      identifierMasked: cin,
      riskBand: firstValue(companyInfo, ["company_status", "companyStatus"]) || "Active",
      details: { status: "Company details fetched", clientId: reference, cin, companyName, companyType: firstValue(data, ["company_type", "companyType"]) || "", companyInfo, directors, charges, providerResponse: response }
    };
  }

  if (service === "PREFILL") {
    const cleanFirstName = String(firstName || "").trim();
    const cleanMiddleName = String(middleName || "").trim();
    const cleanLastName = String(lastName || "").trim();
    const cleanMobile = String(identifier || "").replace(/\D/g, "").slice(-10);
    if (!cleanFirstName || !cleanLastName) throw unprocessable("First name and last name are required");
    if (!/^\d{10}$/.test(cleanMobile)) throw unprocessable("Enter a valid 10 digit mobile number");
    const response = await fetchPrefillWithProvider({ firstName: cleanFirstName, middleName: cleanMiddleName, lastName: cleanLastName, mobileNumber: cleanMobile, remark });
    const data = response.data && typeof response.data === "object" ? response.data : {};
    const cir = data.CIRReportData && typeof data.CIRReportData === "object" ? data.CIRReportData : {};
    const contact = cir.IDAndContactInfo && typeof cir.IDAndContactInfo === "object" ? cir.IDAndContactInfo : {};
    const personal = contact.PersonalInfo && typeof contact.PersonalInfo === "object" ? contact.PersonalInfo : {};
    const name = personal.Name && typeof personal.Name === "object" ? personal.Name : {};
    const fullName = firstValue(name, ["FullName", "fullName"]) || [cleanFirstName, cleanMiddleName, cleanLastName].filter(Boolean).join(" ");
    const reference = firstValue(response, ["transaction_id", "transactionId"]) || firstValue(data, ["client_id", "clientId"]) || `PREFILL_${Date.now()}`;
    return {
      status: "verified",
      customerName: fullName,
      providerReference: reference,
      rawProviderStatus: response.status || "success",
      identifierMasked: cleanMobile,
      riskBand: "Prefill data fetched",
      details: {
        status: "Prefill data fetched", clientId: reference, fullName,
        dateOfBirth: firstValue(personal, ["DateOfBirth", "dateOfBirth"]) || "",
        age: firstValue(personal.Age || {}, ["Age", "age"]) || "",
        identityInfo: contact.IdentityInfo && typeof contact.IdentityInfo === "object" ? contact.IdentityInfo : {},
        addresses: Array.isArray(contact.AddressInfo) ? contact.AddressInfo : [],
        phones: Array.isArray(contact.PhoneInfo) ? contact.PhoneInfo : [],
        emails: Array.isArray(contact.EmailAddressInfo) ? contact.EmailAddressInfo : [],
        providerResponse: response
      }
    };
  }

  if (service === "AADHAAR_OTP") {
    const aadhaarNumber = normalizeAadhaar(identifier);
    if (!isValidAadhaar(aadhaarNumber)) {
      throw unprocessable("Enter a valid 12 digit Aadhaar number");
    }

    const cleanOtp = String(otp || "").replace(/\D/g, "");
    const cleanRequestId = String(requestId || "").trim();
    if (!cleanOtp || !cleanRequestId) {
      if (cleanOtp || cleanRequestId) {
        throw unprocessable("Both OTP and request ID are required to verify Aadhaar OTP");
      }

      const response = await generateAadhaarOtpWithPayprimeProvider({ aadhaarNumber });
      const responseData = response.data && typeof response.data === "object" ? response.data : {};
      const requestReference =
        firstValue(response, ["client_id", "request_id", "requestId", "txnid", "txn_id"]) ||
        firstValue(responseData, ["client_id", "request_id", "requestId", "txnid", "txn_id"]) ||
        `AADHAAR_OTP_${Date.now()}`;
      const providerMessage =
        firstValue(response, ["message", "remarks", "reason"]) ||
        firstValue(responseData, ["message", "remarks", "reason"]) ||
        "Aadhaar OTP sent successfully";

      return {
        status: "pending",
        customerName: customerName || "Aadhaar OTP",
        providerReference: requestReference,
        rawProviderStatus: response.statuscode || response.status || "pending",
        identifierMasked: aadhaarNumber,
        riskBand: providerMessage,
        details: {
          status: providerMessage,
          statusDetail: providerMessage,
          clientId: requestReference,
          requestId: requestReference,
          aadhaarNumber,
          providerResponse: response
        }
      };
    }

    if (!/^\d{4,8}$/.test(cleanOtp)) {
      throw unprocessable("Enter a valid OTP");
    }

    const response = await verifyAadhaarOtpWithPayprimeProvider({ otp: cleanOtp, requestId: cleanRequestId });
    const responseData = response.data && typeof response.data === "object" ? response.data : {};
    const data = responseData.data && typeof responseData.data === "object" ? responseData.data : responseData;
    const providerStatus = normalizeProviderStatus(firstValue(response, ["statuscode", "status"]) || firstValue(data, ["status"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || firstValue(data, ["message", "status"]) || providerStatus;
    const clientId = firstValue(response, ["txnid", "txn_id", "request_id", "requestId"]) || cleanRequestId;
    const providerAadhaar = firstValue(data, ["aadhaar_number", "aadhaarNumber"]);
    const fullAadhaar = String(providerAadhaar || aadhaarNumber).replace(/\D/g, "");
    const aadhaarAddress = data.address && typeof data.address === "object" ? data.address : {};
    const addressParts = [
      firstValue(aadhaarAddress, ["house"]),
      firstValue(aadhaarAddress, ["street"]),
      firstValue(aadhaarAddress, ["loc"]),
      firstValue(aadhaarAddress, ["vtc"]),
      firstValue(aadhaarAddress, ["po"]),
      firstValue(aadhaarAddress, ["subdist"]),
      firstValue(aadhaarAddress, ["dist"]),
      firstValue(aadhaarAddress, ["state"]),
      firstValue(aadhaarAddress, ["country"])
    ].filter(Boolean);

    return {
      status: providerStatus,
      customerName: firstValue(data, ["full_name", "fullName", "name"]) || customerName || "Aadhaar OTP",
      providerReference: clientId,
      rawProviderStatus: response.statuscode || response.status || providerStatus,
      identifierMasked: fullAadhaar,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        statusDetail: firstValue(data, ["status"]) || providerMessage,
        clientId,
        requestId: cleanRequestId,
        fullName: firstValue(data, ["full_name", "fullName", "name"]) || "",
        aadhaarNumber: fullAadhaar,
        dob: firstValue(data, ["dob", "date_of_birth", "dateOfBirth"]) || "",
        gender: firstValue(data, ["gender"]) || "",
        pincode: firstValue(data, ["zip", "pincode", "pin_code"]) || "",
        address: addressParts.join(", "),
        careOf: firstValue(aadhaarAddress, ["care_of", "careOf"]) || "",
        country: firstValue(aadhaarAddress, ["country"]) || "",
        state: firstValue(aadhaarAddress, ["state"]) || "",
        district: firstValue(aadhaarAddress, ["dist", "district"]) || "",
        postOffice: firstValue(aadhaarAddress, ["po", "postOffice"]) || "",
        locality: firstValue(aadhaarAddress, ["loc", "locality"]) || "",
        vtc: firstValue(aadhaarAddress, ["vtc"]) || "",
        street: firstValue(aadhaarAddress, ["street"]) || "",
        subDistrict: firstValue(aadhaarAddress, ["subdist", "subDistrict"]) || "",
        providerResponse: response
      }
    };
  }

  if (service === "UAN_FETCH_BY_PAN") {
    const panNumber = normalizePan(identifier);
    if (!isValidPan(panNumber)) {
      throw unprocessable("Enter a valid PAN number");
    }

    const response = await fetchUanByPanWithProvider({ panNumber });
    const providerStatus = normalizeProviderStatus(firstValue(response, ["status", "verification_status", "result_status"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || providerStatus;
    const uan = firstValue(response, ["uan", "uan_number", "uanNumber", "uan_numbers", "uanNumbers"]);
    const clientId = firstValue(response, ["request_uid", "client_id", "clientId", "id"]) || `UAN_FETCH_BY_PAN_${Date.now()}`;
    return {
      status: providerStatus,
      customerName: customerName || "Fetch UAN by PAN",
      providerReference: clientId,
      rawProviderStatus: response.status || providerStatus,
      identifierMasked: panNumber,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        clientId,
        panNumber,
        uan,
        providerResponse: response
      }
    };
  }

  if (service === "UAN_PROFILE_DETAILS") {
    const uan = normalizeUan(identifier);
    if (!isValidUan(uan)) {
      throw unprocessable("Enter a valid 12 digit UAN number");
    }

    const response = await fetchUanProfileDetailsWithProvider({ uan });
    const providerStatus = normalizeProviderStatus(firstValue(response, ["status", "verification_status", "result_status"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || providerStatus;
    const clientId = firstValue(response, ["request_uid", "client_id", "clientId", "id"]) || `UAN_PROFILE_${Date.now()}`;
    return {
      status: providerStatus,
      customerName: customerName || "UAN Profile Details",
      providerReference: clientId,
      rawProviderStatus: response.status || providerStatus,
      identifierMasked: uan,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        clientId,
        uan,
        fullName: firstValue(response, ["name", "full_name", "fullName", "member_name", "memberName"]) || "",
        dob: firstValue(response, ["date_of_birth", "dateOfBirth", "dob"]) || "",
        gender: firstValue(response, ["gender"]) || "",
        mobile: firstValue(response, ["mobile", "mobile_number", "mobileNumber", "phone"]) || "",
        providerResponse: response
      }
    };
  }

  if (service === "EMPLOYMENT_HISTORY") {
    const uan = normalizeUan(identifier);
    if (!isValidUan(uan)) {
      throw unprocessable("Enter a valid 12 digit UAN number");
    }

    const response = await fetchEmploymentHistoryWithProvider({ uanNumber: uan });
    const providerStatus = normalizeProviderStatus(firstValue(response, ["status", "verification_status", "result_status"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || providerStatus;
    const clientId = firstValue(response, ["request_uid", "client_id", "clientId", "id"]) || `EMPLOYMENT_HISTORY_${Date.now()}`;
    return {
      status: providerStatus,
      customerName: customerName || "Employment History",
      providerReference: clientId,
      rawProviderStatus: response.status || providerStatus,
      identifierMasked: uan,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        clientId,
        uan,
        fullName: firstValue(response, ["name", "full_name", "fullName", "member_name", "memberName", "employee_name", "employeeName"]) || "",
        company: firstValue(response, ["company", "company_name", "companyName", "establishment_name", "establishmentName", "establishment"]) || "",
        memberId: firstValue(response, ["member_id", "memberId", "memberIdNumber"]) || "",
        dateOfJoining: firstValue(response, ["date_of_joining", "dateOfJoining", "doj"]) || "",
        dateOfExit: firstValue(response, ["date_of_exit", "dateOfExit", "doe"]) || "",
        providerResponse: response
      }
    };
  }

  if (service === "EPFO_PASSBOOK") {
    const panNumber = normalizePan(identifier);
    if (!isValidPan(panNumber)) {
      throw unprocessable("Enter a valid PAN number");
    }

    const mobileNumber = String(mobile || "").replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      throw unprocessable("Enter a valid 10 digit mobile number");
    }

    const response = await fetchEpfoPassbookWithProvider({ mobileNumber, panNumber });
    const providerStatus = normalizeProviderStatus(firstValue(response, ["status", "verification_status", "result_status"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || providerStatus;
    const clientId = firstValue(response, ["request_uid", "client_id", "clientId", "id"]) || `EPFO_PASSBOOK_${Date.now()}`;
    return {
      status: providerStatus,
      customerName: customerName || "EPFO Passbook",
      providerReference: clientId,
      rawProviderStatus: response.status || providerStatus,
      identifierMasked: panNumber,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        clientId,
        panNumber,
        mobile: mobileNumber,
        uan: firstValue(response, ["uan", "uan_number", "uanNumber"]) || "",
        fullName: firstValue(response, ["name", "full_name", "fullName", "member_name", "memberName"]) || "",
        balance: firstValue(response, ["balance", "total_balance", "totalBalance", "pf_balance", "pfBalance"]) || "",
        providerResponse: response
      }
    };
  }

  if (service === "EXPERIAN_JSON" || service === "EXPERIAN_PDF") {
    const cleanFirstName = String(firstName || "").trim();
    const cleanLastName = String(lastName || "").trim();
    if (!cleanFirstName || !cleanLastName) {
      throw unprocessable("First name and last name are required");
    }
    const fullName = `${cleanFirstName} ${cleanLastName}`;
    const panNumber = String(identifier || "").trim().toUpperCase();
    const dateOfBirth = String(dob || "").trim();
    if (!isValidDdMmYyyy(dateOfBirth)) {
      throw unprocessable("Date of birth must be a valid date in DD/MM/YYYY format");
    }
    const referenceNumber = `FINREP_EXP_${Date.now()}`;
    const response = isSmartAuthApiConfigured()
      ? await fetchExperianCreditReportWithSmartAuth({ name: fullName, mobile: String(mobile || "").trim() })
      : await fetchExperianCreditReportWithSatmat({
          reference_number: referenceNumber,
          mobile_no: String(mobile || "").trim(),
          first_name: cleanFirstName,
          last_name: cleanLastName,
          date_of_birth: dateOfBirth,
          pan: panNumber,
          email: String(email || "").trim(),
          address: String(address || "").trim(),
          pinCode: String(pincode || "").trim(),
          stateCode: "1"
        });
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || "Experian credit report generated";
    let mappedReport = null;
    try {
      mappedReport = mapExperianJsonPayload(response, {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        mobile: String(mobile || "").trim(),
        pan: panNumber,
        dob: dateOfBirth,
        email: String(email || "").trim(),
        address: String(address || "").trim(),
        pincode: String(pincode || "").trim()
      }).report;
    } catch {
      mappedReport = null;
    }
    const hasValidReport = Boolean(mappedReport);
    const providerStatus =
      hasValidReport ||
      (service === "EXPERIAN_JSON" &&
        (response.status === true ||
          Number(response.result_code) === 101 ||
          Number(response.http_response_code) === 200))
        ? "verified"
        : "failed";
    let reportFileBase64 = "";
    let reportFileName = "";
    if (service === "EXPERIAN_PDF" && providerStatus === "verified") {
      const rendered = await renderExperianReport(mappedReport);
      reportFileBase64 = rendered.bytes.toString("base64");
      const customerSlug = (fullName || "customer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      reportFileName = `experian-credit-report-${customerSlug || "customer"}.pdf`;
    }
    return {
      status: providerStatus,
      customerName: fullName || (service === "EXPERIAN_PDF" ? "Experian PDF" : "Experian JSON"),
      providerReference: firstValue(response, ["reference_number", "request_id", "txnid"]) || referenceNumber,
      rawProviderStatus: response.status ?? providerStatus,
      identifierMasked: panNumber,
      riskBand: providerMessage,
      reportFileBase64,
      reportContentType: reportFileBase64 ? "application/pdf" : "",
      reportFileName,
      details: {
        status: providerMessage,
        statusDetail: providerMessage,
        clientId: referenceNumber,
        fullName,
        mobile,
        panNumber,
        email: String(email || "").trim(),
        dob: dateOfBirth,
        address: String(address || "").trim(),
        stateCode: "1",
        pincode: String(pincode || "").trim(),
        providerResponse: response
      }
    };
  }

  if (service === "FACE_MATCH") {
    const referenceNumber = `FINREP_FACE_${Date.now()}`;
    const faceMatchProvider = isSmartAuthApiConfigured() ? matchFacesWithBefisc : matchFacesWithSatmat;
    const response = await faceMatchProvider({
      referenceNumber,
      selfieFileName,
      selfieFileDataUrl,
      cardImageFileName,
      cardImageFileDataUrl
    });
    const data = response.data && typeof response.data === "object" ? response.data : response;
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || firstValue(data, ["message", "remarks", "reason"]) || "Face match processed";
    return {
      status: "verified",
      customerName: String(customerName || "Face Match").trim(),
      providerReference: firstValue(response, ["reference_number", "request_id", "txnid"]) || referenceNumber,
      rawProviderStatus: response.status ?? "processed",
      identifierMasked: referenceNumber,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        statusDetail: providerMessage,
        clientId: referenceNumber,
        sameFace: firstValue(data, ["same_face", "sameFace", "face_match", "faceMatch", "matched"]),
        confidence: firstValue(data, ["confidence", "match_percentage", "matchPercentage", "score"]),
        personImageBlur: firstValue(data, ["person_image_blur", "personImageBlur"]),
        cardImageBlur: firstValue(data, ["card_image_blur", "cardImageBlur"]),
        personIdentified: firstValue(data, ["person_identified", "personIdentified"]),
        cardIdentified: firstValue(data, ["card_identified", "cardIdentified"]),
        providerResponse: response
      }
    };
  }

  if (service === "GSTIN") {
    const gstin = String(identifier || "").trim().toUpperCase();
    if (!isValidGstin(gstin)) {
      throw unprocessable("Enter a valid GSTIN");
    }

    const response = await verifyGstinWithPayprimeProvider({ gstin });
    const responseData = response.data && typeof response.data === "object" ? response.data : {};
    const data = responseData.data && typeof responseData.data === "object" ? responseData.data : responseData;
    const providerStatus = String(response.statuscode || "").toUpperCase() === "TXN"
      ? "verified"
      : normalizeProviderStatus(firstValue(response, ["statuscode", "status"]) || firstValue(data, ["status", "gstin_status", "gstinStatus"]));
    const providerMessage =
      firstValue(response, ["message", "remarks", "reason"]) ||
      firstValue(data, ["message", "status", "gstin_status", "gstinStatus"]) ||
      providerStatus;
    const clientId = firstValue(response, ["txnid", "txn_id", "request_id", "requestId"]) || `GSTIN_${Date.now()}`;
    const businessName = firstValue(data, ["business_name", "businessName", "trade_name", "tradeName"]);
    const legalName = firstValue(data, ["legal_name", "legalName"]);

    return {
      status: providerStatus,
      customerName: businessName || legalName || customerName || "GSTIN Verification",
      providerReference: clientId,
      rawProviderStatus: response.statuscode || response.status || providerStatus,
      identifierMasked: gstin,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        statusDetail: firstValue(data, ["gstin_status", "gstinStatus", "status"]) || providerMessage,
        clientId,
        gstin: firstValue(data, ["gstin"]) || gstin,
        panNumber: firstValue(data, ["pan_number", "panNumber"]) || "",
        businessName: businessName || "",
        legalName: legalName || "",
        centerJurisdiction: firstValue(data, ["center_jurisdiction", "centerJurisdiction"]) || "",
        stateJurisdiction: firstValue(data, ["state_jurisdiction", "stateJurisdiction"]) || "",
        dateOfRegistration: firstValue(data, ["date_of_registration", "dateOfRegistration"]) || "",
        constitutionOfBusiness: firstValue(data, ["constitution_of_business", "constitutionOfBusiness"]) || "",
        taxpayerType: firstValue(data, ["taxpayer_type", "taxpayerType"]) || "",
        gstinStatus: firstValue(data, ["gstin_status", "gstinStatus"]) || "",
        dateOfCancellation: firstValue(data, ["date_of_cancellation", "dateOfCancellation"]) || "",
        fieldVisitConducted: firstValue(data, ["field_visit_conducted", "fieldVisitConducted"]) || "",
        natureBusActivities: Array.isArray(data.nature_bus_activities) ? data.nature_bus_activities : data.natureBusActivities || [],
        aadhaarValidation: firstValue(data, ["aadhaar_validation", "aadhaarValidation"]) || "",
        aadhaarValidationDate: firstValue(data, ["aadhaar_validation_date", "aadhaarValidationDate"]) || "",
        address: firstValue(data, ["address"]) || "",
        filingStatus: Array.isArray(data.filing_status) ? data.filing_status : data.filingStatus || [],
        filingFrequency: Array.isArray(data.filing_frequency) ? data.filing_frequency : data.filingFrequency || [],
        hsnInfo: Array.isArray(data.hsn_info) ? data.hsn_info : data.hsnInfo || [],
        providerResponse: response
      }
    };
  }

  if (service === "BANK_VERIFICATION") {
    const accountNumber = String(identifier || "").replace(/\D/g, "");
    const cleanIfsc = normalizeIfscCode(ifsc);
    if (!/^\d{6,18}$/.test(accountNumber)) {
      throw unprocessable("Enter a valid bank account number");
    }
    const response = await verifyBankAccountWithPayprimeProvider({ accountNumber, ifsc: cleanIfsc });
    const responseData = response.data && typeof response.data === "object" ? response.data : {};
    const data = responseData.data && typeof responseData.data === "object" ? responseData.data : responseData;
    const providerStatus = String(response.statuscode || "").toUpperCase() === "TXN"
      ? "verified"
      : normalizeProviderStatus(firstValue(response, ["statuscode", "status"]) || firstValue(data, ["status"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || firstValue(data, ["message", "remarks"]) || providerStatus;
    const clientId = firstValue(response, ["txnid", "txn_id", "request_id", "requestId", "payid", "refno"]) || `BANK_VERIFICATION_${Date.now()}`;
    const fullName = firstValue(data, ["full_name", "fullName", "name"]) || "";

    return {
      status: providerStatus,
      customerName: fullName || customerName || "Bank Verification",
      providerReference: clientId,
      rawProviderStatus: response.statuscode || response.status || providerStatus,
      identifierMasked: accountNumber,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        statusDetail: providerMessage,
        clientId,
        accountNumber,
        ifsc: cleanIfsc,
        accountExists: data.account_exists ?? data.accountExists ?? "",
        fullName,
        upiId: firstValue(data, ["upi_id", "upiId"]) || "",
        remarks: firstValue(data, ["remarks"]) || "",
        ifscDetails: Array.isArray(data.ifsc_details) ? data.ifsc_details : data.ifscDetails || [],
        providerResponse: response
      }
    };
  }

  if (service === "RC_BASIC") {
    const registrationNumber = String(identifier || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(registrationNumber)) {
      throw unprocessable("Enter a valid vehicle registration number");
    }

    const response = await verifyRcBasicWithProvider({ registrationNumber });
    const cardData = response.cardData && typeof response.cardData === "object" ? response.cardData : {};
    const owner = cardData.owner_details && typeof cardData.owner_details === "object" ? cardData.owner_details : {};
    const vehicle = cardData.vehicle_details && typeof cardData.vehicle_details === "object" ? cardData.vehicle_details : {};
    const registration = cardData.registration_details && typeof cardData.registration_details === "object" ? cardData.registration_details : {};
    const insurance = cardData.insurance_details && typeof cardData.insurance_details === "object" ? cardData.insurance_details : {};
    const finance = cardData.finance_details && typeof cardData.finance_details === "object" ? cardData.finance_details : {};
    const pucc = cardData.pucc_details && typeof cardData.pucc_details === "object" ? cardData.pucc_details : {};
    const permit = cardData.permit_details && typeof cardData.permit_details === "object" ? cardData.permit_details : {};
    const statusDetails = cardData.status_details && typeof cardData.status_details === "object" ? cardData.status_details : {};
    const success = Number(response.status) === 1 && Number(response.error) === 0;
    const providerMessage = String(response.msg || response.message || (success ? "RC Basic validation successful" : "RC verification failed"));
    const clientId = String(response.optransid || response.orderid || response.partnerreqid || `RC_BASIC_${Date.now()}`);
    return {
      status: success ? "verified" : "failed",
      customerName: String(owner.name || customerName || "Basic RC Verification"),
      providerReference: clientId,
      rawProviderStatus: response.status,
      identifierMasked: registrationNumber,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        clientId,
        registrationNumber,
        owner,
        vehicle,
        registration,
        insurance,
        finance,
        pucc,
        permit,
        statusDetails,
        providerResponse: response
      }
    };
  }

  if (service === "DRIVING_LICENSE") {
    const licenseNumber = String(identifier || "").trim().toUpperCase();
    const cleanDob = String(dob || "").trim();
    if (!licenseNumber || licenseNumber.length < 6) {
      throw unprocessable("Enter a valid driving license number");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
      throw unprocessable("Enter date of birth in YYYY-MM-DD format");
    }

    const response = await verifyDrivingLicenseWithPayprimeProvider({ licenseNumber, dob: cleanDob });
    const responseData = response.data && typeof response.data === "object" ? response.data : {};
    const data = responseData.data && typeof responseData.data === "object" ? responseData.data : responseData;
    const providerStatus = String(response.statuscode || "").toUpperCase() === "TXN"
      ? "verified"
      : normalizeProviderStatus(firstValue(response, ["statuscode", "status"]) || firstValue(data, ["status", "current_status", "currentStatus"]));
    const providerMessage = firstValue(response, ["message", "remarks", "reason"]) || firstValue(data, ["message", "status", "current_status", "currentStatus"]) || providerStatus;
    const clientId = firstValue(response, ["txnid", "txn_id", "request_id", "requestId"]) || `DRIVING_LICENSE_${Date.now()}`;
    const fullName = firstValue(data, ["name", "full_name", "fullName"]) || "";
    const fullLicenseNumber = String(firstValue(data, ["license_number", "licenseNumber"]) || licenseNumber).trim().toUpperCase();

    return {
      status: providerStatus,
      customerName: fullName || customerName || "Driving License Verification",
      providerReference: clientId,
      rawProviderStatus: response.statuscode || response.status || providerStatus,
      identifierMasked: fullLicenseNumber,
      riskBand: providerMessage,
      details: {
        status: providerMessage,
        statusDetail: firstValue(data, ["current_status", "currentStatus", "status"]) || providerMessage,
        clientId,
        licenseNumber: fullLicenseNumber,
        fullName,
        state: firstValue(data, ["state"]) || "",
        permanentAddress: firstValue(data, ["permanent_address", "permanentAddress"]) || "",
        permanentZip: firstValue(data, ["permanent_zip", "permanentZip"]) || "",
        cityName: firstValue(data, ["city_name", "cityName"]) || "",
        temporaryAddress: firstValue(data, ["temporary_address", "temporaryAddress"]) || "",
        temporaryZip: firstValue(data, ["temporary_zip", "temporaryZip"]) || "",
        citizenship: firstValue(data, ["citizenship"]) || "",
        rtoName: firstValue(data, ["ola_name", "olaName"]) || "",
        rtoCode: firstValue(data, ["ola_code", "olaCode"]) || "",
        gender: firstValue(data, ["gender"]) || "",
        fatherOrHusbandName: firstValue(data, ["father_or_husband_name", "fatherOrHusbandName"]) || "",
        dob: firstValue(data, ["dob", "date_of_birth", "dateOfBirth"]) || cleanDob,
        doe: firstValue(data, ["doe", "date_of_expiry", "dateOfExpiry"]) || "",
        doi: firstValue(data, ["doi", "date_of_issue", "dateOfIssue"]) || "",
        transportDoe: firstValue(data, ["transport_doe", "transportDoe"]) || "",
        transportDoi: firstValue(data, ["transport_doi", "transportDoi"]) || "",
        initialDoi: firstValue(data, ["initial_doi", "initialDoi"]) || "",
        currentStatus: firstValue(data, ["current_status", "currentStatus"]) || "",
        bloodGroup: firstValue(data, ["blood_group", "bloodGroup"]) || "",
        hasImage: data.has_image === true ? "Yes" : data.has_image === false ? "No" : "",
        vehicleClasses: Array.isArray(data.vehicle_classes) ? data.vehicle_classes : data.vehicleClasses || [],
        vehicleClassDescription: Array.isArray(data.vehicle_class_description) ? data.vehicle_class_description : data.vehicleClassDescription || [],
        badgeNumber: Array.isArray(data.badge_number) ? data.badge_number : data.badgeNumber || [],
        additionalCheck: Array.isArray(data.additional_check) ? data.additional_check : data.additionalCheck || [],
        providerResponse: response
      }
    };
  }

  if (service === "ESIGN") {
    const { cleanName, cleanEmail, cleanPhone } = normalizeEsignInput({ customerName, identifier, email, mobile });

    const response = await createSmartAuthEsignRequest({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      documentTitle,
      documentFileName,
      documentFileDataUrl,
      successRedirectUrl,
      errorRedirectUrl
    });
    const sendMessage = String(response?.message || "Aadhaar eSign workflow created").trim();

    return {
      status: "pending",
      customerName: cleanName,
      providerReference: response.txnId || response.contractId || `ESIGN_${Date.now()}`,
      rawProviderStatus: "processing",
      identifierMasked: cleanPhone,
      riskBand: sendMessage,
      details: {
        provider: "smartauth",
        status: "processing",
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        documentTitle: response.documentTitle,
        documentFileName: response.documentFileName,
        uploadTxnId: response.uploadTxnId,
        txnId: response.txnId,
        leadId: response.leadId,
        contractId: response.contractId,
        workflowUrl: response.workflowUrl,
        expiresAt: response.expiresAt,
        recipientName: cleanName,
        recipientEmail: cleanEmail,
        recipientPhone: cleanPhone,
        providerResponse: response
      }
    };
  }

  if (service === "ECONSENT") {
    const { cleanName, cleanEmail, cleanPhone } = normalizeEsignInput({ customerName, identifier, email, mobile });
    const response = await createEConsentSession({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      documentTitle,
      documentFileName,
      documentFileDataUrl,
      location,
      date
    });
    const providerStatus = String(response.statusLabel || response.status || "pending").trim();
    const proxyUrls = eConsentProxyUrls(response.documentId);

    return {
      status: "pending",
      customerName: cleanName,
      providerReference: response.documentId || `ECONSENT_${Date.now()}`,
      rawProviderStatus: providerStatus,
      identifierMasked: cleanPhone,
      riskBand: providerStatus,
      details: {
        provider: "econsent",
        status: providerStatus,
        statusLabel: response.statusLabel || providerStatus,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        documentTitle: response.documentTitle,
        documentFileName: response.documentFileName,
        documentId: response.documentId,
        transactionId: response.transactionId,
        signUrl: response.signUrl,
        ...proxyUrls,
        recipientName: cleanName,
        recipientEmail: cleanEmail,
        recipientPhone: cleanPhone,
        signer: response.signer || {
          name: cleanName,
          email: cleanEmail,
          mobile: cleanPhone,
          location: String(location || "India").trim() || "India"
        },
        providerResponse: response
      }
    };
  }

  if (creditReportServices.has(service)) {
    return submitCreditReportVerification({ service, customerName, identifier, dob, mobile, gender, address, state, pincode });
  }

  return submitVerificationToProvider({
    service,
    customerName,
    identifier
  });
}

function assertServiceNotInMaintenance(service) {
  if (
    (service === "CIBIL" && env.serviceMaintenance.tuCibilPdfDisabled) ||
    (service === "CIBIL_JSON" && env.serviceMaintenance.tuCibilJsonDisabled)
  ) {
    throw serviceUnavailable(env.serviceMaintenance.tuCibilDisabledMessage);
  }
}

async function submitCreditReportVerification({ service, customerName, identifier, dob, mobile, gender, address, state, pincode }) {
  const config = creditReportConfigs[service];
  if (!config) {
    throw forbidden("Unsupported verification service");
  }

  const cleanName = String(customerName || "").trim();
  if (!cleanName) {
    throw unprocessable("Customer name is required");
  }

  const cleanMobile = String(mobile || identifier || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    throw unprocessable("Enter a valid 10 digit mobile number");
  }

  const panNumber = config.requiresPan ? normalizePan(identifier) : "";
  if (config.requiresPan && !isValidPan(panNumber)) {
    throw unprocessable("Enter a valid PAN number");
  }

  const cleanGender = config.requiresGender ? String(gender || "").trim().toLowerCase() : "";
  if (config.requiresGender && !["male", "female", "other"].includes(cleanGender)) {
    throw unprocessable("Select a valid gender");
  }

  const cleanDob = String(dob || "").trim();
  if (config.requiresDob && !/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
    throw unprocessable("Date of birth is required in YYYY-MM-DD format");
  }

  const cleanAddress = String(address || "").trim();
  if (config.requiresAddress && !cleanAddress) {
    throw unprocessable("Address is required");
  }

  const cleanState = String(state || "").trim().toUpperCase();
  if (config.requiresAddress && !/^[A-Z]{2}$/.test(cleanState)) {
    throw unprocessable("State code must be a 2-letter code");
  }

  const cleanPincode = String(pincode || "").replace(/\D/g, "");
  if (config.requiresAddress && !/^\d{6}$/.test(cleanPincode)) {
    throw unprocessable("Enter a valid 6 digit pincode");
  }

  const response = await config.provider({
    name: cleanName,
    mobile: cleanMobile,
    pan: panNumber,
    gender: cleanGender,
    dob: cleanDob,
    address: cleanAddress,
    state: cleanState,
    pincode: cleanPincode
  });
  const providerReference = providerReferenceFrom(response, config.referencePrefix);
  const reportFileBase64 = config.isJson ? "" : normalizePdfFile(response.file);
  const identitySuffix = (panNumber || cleanMobile).slice(-4);

  return {
    status: "verified",
    customerName: cleanName,
    providerReference,
    rawProviderStatus: response.message || "Report generated",
    identifierMasked: panNumber || cleanMobile,
    riskBand: response.message || "Report generated",
    reportFileBase64,
    reportContentType: reportFileBase64 ? response.contentType || "application/pdf" : "",
    reportFileName: reportFileBase64 ? `${config.fileNamePrefix}-${identitySuffix}.pdf` : "",
    details: {
      name: cleanName,
      mobile: cleanMobile,
      ...(panNumber ? { panNumber } : {}),
      ...(cleanGender ? { gender: cleanGender } : {}),
      ...(cleanDob ? { dob: cleanDob } : {}),
      ...(cleanAddress ? { address: cleanAddress } : {}),
      ...(cleanState ? { state: cleanState } : {}),
      ...(cleanPincode ? { pincode: cleanPincode } : {}),
      clientId: providerReference,
      reportType: config.reportType,
      message: response.message || "Report generated",
      providerResponse: omitFile(response)
    }
  };
}

function providerReferenceFrom(response, fallbackPrefix) {
  return response?.request_uid || response?.report_id || response?.client_id || response?.reference_id || `${fallbackPrefix}_${Date.now()}`;
}

async function resolveVerificationBilling({ user, service }) {
  const billingService = billingPriceKeyByService[service] || (service.toLowerCase() === "aadhaar" ? "aadhaar" : service.toLowerCase());
  if (user.role === ROLES.SUPER_ADMIN) {
    const pricingPayload = await getApiPricing();
    return { fee: pricingPayload.pricing[billingService], plan: null };
  }

  const pricing = normalizeApiPricing(user.apiPricing);
  const fee = Number(pricing[billingService]);
  if (!Number.isFinite(fee) || fee <= 0) {
    throw forbidden(`${service} pricing is not configured`);
  }

  return { fee, plan: null };
}

function normalizeEsignInput({ customerName, identifier, email, mobile }) {
  const cleanName = String(customerName || "").trim();
  const cleanEmail = String(email || "").toLowerCase().trim();
  const cleanPhone = String(identifier || mobile || "").replace(/\D/g, "");

  if (!cleanName) {
    throw unprocessable("Customer name is required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw unprocessable("Enter a valid email address");
  }
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw unprocessable("Enter a valid 10 digit mobile number");
  }

  return { cleanName, cleanEmail, cleanPhone };
}

async function creditParentMargin({ user, service, fee, plan, reference, customerName }) {
  const billingKey = billingPriceKeyByService[service] || (service.toLowerCase() === "aadhaar" ? "aadhaar" : service.toLowerCase());
  if (!billingKey || !reference) return;

  const chain = await resolveUpstreamChain(user);
  if (!chain.length) return;

  let downstreamPrice = Number(fee || 0);
  for (const parent of chain) {
    const parentPrice = Number(normalizeApiPricing(parent.apiPricing)[billingKey] || 0);
    const margin = Math.round((downstreamPrice - parentPrice) * 100) / 100;
    if (Number.isFinite(margin) && margin > 0) {
      const creditedOwner = await creditWalletForResellerMargin({
        user: parent,
        service,
        connects: margin,
        reference: `${reference}:margin:${parent._id}`,
        sourceUserName: customerName || user.name
      });

      if (creditedOwner) {
        await recordActivity({
          user: creditedOwner,
          action: `Rs. ${formatPoints(margin)} API margin credited from ${customerName || user.name}`,
          service: "Wallet"
        });
      }
    }
    downstreamPrice = parentPrice;
  }
}

async function resolveUpstreamChain(user) {
  const chain = [];
  const seen = new Set([String(user?._id || "")]);
  let parentId = user?.parent || user?.invitedBy;

  while (parentId) {
    const parent = await User.findById(parentId).select("name email role parent invitedBy apiPricing walletBalanceUnits status");
    if (!parent) break;
    const parentKey = String(parent._id);
    if (seen.has(parentKey)) break;
    seen.add(parentKey);
    if (parent.role !== ROLES.SUPER_ADMIN) {
      chain.push(parent);
    }
    parentId = parent.parent || parent.invitedBy;
  }

  return chain;
}

function formatPoints(value) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function firstValue(source, keys) {
  for (const key of keys) {
    const direct = source?.[key];
    if (direct !== undefined && direct !== null && direct !== "") return String(direct);
  }

  for (const value of Object.values(source || {})) {
    if (value && typeof value === "object") {
      const nested = firstValue(value, keys);
      if (nested) return nested;
    }
  }

  return "";
}

function lastDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? digits.slice(-4) : "";
}

function normalizeProviderStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (["err", "failed", "failure", "invalid", "rejected", "not_match", "mismatch", "expired", "not allowed"].some((item) => normalized.includes(item))) {
    return "failed";
  }
  if (["pending", "processing", "queued", "created", "draft", "initiated", "sent", "requested"].some((item) => normalized.includes(item))) {
    return "pending";
  }
  return "verified";
}

function esignStatusText(response) {
  const status =
    firstValue(response, ["status", "documentStatus", "document_status", "signing_status", "envelope_status", "envelopeStatus"]) ||
    firstValue(response?.data, ["status", "documentStatus", "document_status", "signing_status", "envelope_status", "envelopeStatus"]) ||
    "";
  const message = firstValue(response, ["message", "remarks", "reason"]) || firstValue(response?.data, ["message", "remarks", "reason"]);
  const normalized = `${status} ${message}`.trim();
  return normalized || "pending";
}

async function persistVerifiedEsignStatus(verification) {
  if (!isVerifiedEsignRecord(verification) || verification.status === "verified") return;

  verification.status = "verified";
  verification.rawProviderStatus = "signed";
  verification.riskBand = "Document has been signed";
  verification.details = {
    ...(verification.details || {}),
    status: "signed"
  };
  await verification.save();
}

function isVerifiedEsignRecord(verification) {
  if (verification?.service !== "ESIGN") return false;

  const detailStatus = verification.details?.status || "";
  const statusResponse = verification.details?.statusResponse;
  if (isSignedEsignStatus(detailStatus) || isSignedEsignStatus(esignStatusText(statusResponse))) {
    return true;
  }

  if (verification.status !== "verified") return false;
  return !isCreatedEsignRequest(verification.details?.providerResponse);
}

function isSignedEsignStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) return false;
  if (
    normalized.includes("not signed") ||
    normalized.includes("not completed") ||
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("created") ||
    normalized.includes("request created") ||
    normalized.includes("invitation sent") ||
    normalized.includes("opened") ||
    normalized.includes("expired")
  ) {
    return false;
  }
  return normalized === "1" || normalized === "success" || normalized === "verified" || normalized.includes("signed") || normalized.includes("completed");
}

function smartAuthEsignStatusText(response) {
  const status = response?.status ?? response?.statuscode ?? response?.status_code;
  const message = String(response?.message || "").trim();
  if (Number(status) === 1) return message || "success";
  if (Number(status) === 2) return "processing";
  return message || String(status || "pending");
}

function eConsentStatusText(response) {
  return String(response?.statusLabel || response?.status || response?.message || "pending").trim();
}

function isSignedEConsentStatus(response) {
  const status = eConsentStatusText(response).toLowerCase();
  return Boolean(response?.signedDocumentAvailable) || status === "signed" || status.includes("signed") || status.includes("completed");
}

function isCreatedEsignRequest(response) {
  const status = esignStatusText(response).toLowerCase();
  return status.includes("created") || status.includes("request created") || status.includes("invitation sent");
}

function normalizePdfFile(file) {
  const value = String(file || "");
  if (value.startsWith("data:")) {
    return value.split(",").pop() || "";
  }
  if (value.startsWith("%PDF")) {
    return Buffer.from(value, "binary").toString("base64");
  }
  return value.replace(/\s/g, "");
}

function maskMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `XXXXXX${digits.slice(-4)}` : "";
}

function normalizeStoredPan(value) {
  const pan = String(value || "").trim().toUpperCase();
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) ? pan : "";
}

function normalizeStoredMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const mobile = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9][0-9]{9}$/.test(mobile) ? mobile : "";
}

function maskDrivingLicense(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (!clean) return "";
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 2)}${"X".repeat(Math.max(0, clean.length - 6))}${clean.slice(-4)}`;
}

function normalizeUan(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function isValidUan(value) {
  return /^\d{12}$/.test(String(value || ""));
}

function isValidGstin(value) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(value || "").trim().toUpperCase());
}

function normalizeIfscCode(value) {
  const clean = String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 11);
  if (clean.length >= 5 && clean[4] === "O") {
    return `${clean.slice(0, 4)}0${clean.slice(5)}`;
  }
  return clean;
}

function maskUan(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `XXXXXXXX${digits.slice(-4)}` : "";
}

function omitFile(response) {
  const { file, ...rest } = response || {};
  return rest;
}

function auditVerificationRequest(request = {}) {
  const audit = {};
  for (const [key, value] of Object.entries(request)) {
    if (key.toLowerCase().includes("filedata")) {
      audit[key] = value ? `[binary data omitted: ${String(value).length} characters]` : "";
    } else {
      audit[key] = value;
    }
  }
  return audit;
}

function failedProviderReference(providerAudit, service) {
  const response = providerAudit?.response && typeof providerAudit.response === "object" ? providerAudit.response : {};
  return String(
    response.request_uid || response.request_id || response.requestId || response.client_ref_num || response.txnid || `${service}_FAILED_${Date.now()}`
  );
}

async function resolveVerificationActorIds(user) {
  if (user.role === ROLES.SUPER_ADMIN) return null;

  const seen = new Set([String(user._id)]);
  let frontier = [user._id];

  while (frontier.length > 0) {
    const children = await User.find({
      $or: [
        { parent: { $in: frontier } },
        { invitedBy: { $in: frontier } }
      ]
    }).select("_id");

    frontier = children
      .map((child) => String(child._id))
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }

  return Array.from(seen);
}

export function toVerificationDto(verification, { includeReport = true, includeHeavyDetails = true } = {}) {
  const hasReportFile = Boolean(verification.reportFileName || verification.reportFileBase64);
  const actor = verification.actor && typeof verification.actor === "object" ? verification.actor : null;
  const status = verification.service === "ESIGN" && isVerifiedEsignRecord(verification) ? "verified" : verification.status;
  const details = sanitizeVerificationDetails(verification.details || {}, { includeHeavyDetails });
  const panNumber = normalizeStoredPan(verification.panNumber || details.panNumber);
  const mobileNumber = normalizeStoredMobile(
    verification.mobileNumber || details.mobile || details.mobileNumber || details.phone
  );
  const requestBody = details.requestBody && typeof details.requestBody === "object" ? details.requestBody : {};
  const requestIdentifier = String(
    requestBody.identifier ||
      requestBody.aadhaar_number ||
      requestBody.aadhaarNumber ||
      requestBody.id_number ||
      requestBody.idNumber ||
      requestBody.uan ||
      requestBody.uan_number ||
      requestBody.gstin ||
      requestBody.account_number ||
      requestBody.accountNumber ||
      requestBody.license_number ||
      requestBody.licenseNumber ||
      requestBody.registration_number ||
      requestBody.registrationNumber ||
      ""
  ).trim().toUpperCase();
  const fullIdentifier = panNumber || mobileNumber || requestIdentifier || verification.identifierMasked;
  const unmaskedDetails = { ...details };

  if (["AADHAAR", "AADHAAR_VALIDATION", "AADHAAR_OTP"].includes(verification.service) && requestIdentifier) {
    unmaskedDetails.aadhaarNumber = requestIdentifier.replace(/\D/g, "");
  } else if (["PAN", "UAN_FETCH_BY_PAN", "EPFO_PASSBOOK", "CIBIL", "CIBIL_JSON", "EQUIFAX", "EQUIFAX_JSON", "EXPERIAN_CREDIT_REPORT", "EXPERIAN_JSON", "EXPERIAN_PDF"].includes(verification.service) && panNumber) {
    unmaskedDetails.panNumber = panNumber;
  } else if (["UAN_PROFILE_DETAILS", "EMPLOYMENT_HISTORY"].includes(verification.service) && requestIdentifier) {
    unmaskedDetails.uan = requestIdentifier.replace(/\D/g, "");
  } else if (verification.service === "GSTIN" && requestIdentifier) {
    unmaskedDetails.gstin = requestIdentifier;
  } else if (verification.service === "BANK_VERIFICATION" && requestIdentifier) {
    unmaskedDetails.accountNumber = requestIdentifier;
  } else if (verification.service === "DRIVING_LICENSE" && requestIdentifier) {
    unmaskedDetails.licenseNumber = requestIdentifier;
  } else if (verification.service === "RC_BASIC" && requestIdentifier) {
    unmaskedDetails.registrationNumber = requestIdentifier;
  }

  if (mobileNumber) {
    unmaskedDetails.mobile = mobileNumber;
    unmaskedDetails.mobileNumber = mobileNumber;
    if (unmaskedDetails.phone) unmaskedDetails.phone = mobileNumber;
    if (unmaskedDetails.recipientPhone) unmaskedDetails.recipientPhone = mobileNumber;
  }
  return {
    id: String(verification._id),
    service: verification.service,
    status,
    customerName: verification.customerName,
    identifierMasked: fullIdentifier,
    panNumber,
    mobileNumber,
    score: verification.score,
    riskBand: verification.riskBand,
    createdAt: verification.createdAt,
    completedAt: verification.updatedAt,
    providerReference: verification.providerReference,
    actorId: actor?._id ? String(actor._id) : verification.actor ? String(verification.actor) : "",
    actorName: actor?.name || "",
    actorEmail: actor?.email || "",
    actorRole: actor?.role || verification.actorRole || "",
    details: {
      ...unmaskedDetails,
      ...(panNumber ? { panNumber } : {}),
      ...(mobileNumber ? { mobile: mobileNumber, mobileNumber } : {})
    },
    hasReportFile,
    reportFileName: verification.reportFileName || "",
    reportContentType: verification.reportContentType || "",
    reportFileDataUrl:
      includeReport && verification.reportFileBase64 && verification.reportContentType
        ? `data:${verification.reportContentType};base64,${verification.reportFileBase64}`
        : ""
  };
}

function assertCanAccessVerificationService({ user, service }) {
  if (service === "AADHAAR" && user.role !== ROLES.SUPER_ADMIN) {
    throw forbidden("Only super admin can view Aadhaar verification");
  }

  const verificationPermission = verificationPermissionByService[service];
  if (verificationPermission && !hasPermission(user, verificationPermission.view)) {
    throw forbidden("Verification permission is required");
  }
}

async function withVerificationSearch(filter, search) {
  const term = String(search || "").trim();
  if (!term) return filter;

  const pattern = searchPattern(term);
  const matchedRoles = roleSearchValues(term);
  const actorScope = filter.actor && typeof filter.actor === "object" && filter.actor.$in ? { _id: { $in: filter.actor.$in } } : {};
  const matchedActors = await User.find({
    ...actorScope,
    $or: [
      { name: pattern },
      { email: pattern },
      { role: pattern },
      ...(matchedRoles.length > 0 ? [{ role: { $in: matchedRoles } }] : [])
    ]
  }).select("_id");
  const clauses = [
    { customerName: pattern },
    { identifierMasked: pattern },
    { status: pattern },
    { riskBand: pattern },
    { providerReference: pattern },
    { actorName: pattern },
    { actorEmail: pattern },
    { actorRole: pattern },
    { rawProviderStatus: pattern },
    { reportFileName: pattern },
    { "details.fullName": pattern },
    { "details.name": pattern },
    { "details.email": pattern },
    { "details.phone": pattern },
    { "details.mobile": pattern },
    { "details.mobileNumber": pattern },
    { "details.gender": pattern },
    { "details.dob": pattern },
    { "details.address": pattern },
    { "details.state": pattern },
    { "details.pincode": pattern },
    { "details.status": pattern },
    { "details.statusDetail": pattern },
    { "details.clientId": pattern },
    { "details.requestId": pattern },
    { "details.panNumber": pattern },
    { "details.aadhaarNumber": pattern },
    { "details.uan": pattern },
    { "details.company": pattern },
    { "details.memberId": pattern },
    { "details.dateOfJoining": pattern },
    { "details.dateOfExit": pattern },
    { "details.documentTitle": pattern },
    { "details.documentFileName": pattern },
    { "details.contractId": pattern },
    { "details.txnId": pattern },
    ...dateSearchClauses("createdAt", term)
  ];
  if (matchedRoles.length > 0) {
    clauses.push({ actorRole: { $in: matchedRoles } });
  }
  if (matchedActors.length > 0) {
    clauses.push({ actor: { $in: matchedActors.map((account) => account._id) } });
  }

  return {
    $and: [
      filter,
      { $or: clauses }
    ]
  };
}

function sanitizeVerificationDetails(details, { includeHeavyDetails }) {
  if (!details || typeof details !== "object") return {};
  const customerSafeDetails = redactProviderIdentityFromDetails(details);
  if (includeHeavyDetails) return customerSafeDetails;

  const { providerResponse, raw, statusResponse, ...safeDetails } = customerSafeDetails;
  return safeDetails;
}

const customerProviderIdentityKeys = new Set([
  "provider",
  "providertype",
  "providername",
  "upstreamprovider",
  "upstreamprovidername"
]);

const customerSecretKeys = new Set([
  "authorization",
  "apikey",
  "apitoken",
  "authkey",
  "clientsecret",
  "memberid",
  "memberpassword",
  "password",
  "token"
]);

const customerMessageKeys = new Set([
  "error",
  "errormessage",
  "message",
  "providermessage",
  "reason",
  "remarks",
  "statuslabel"
]);

function redactProviderIdentityFromDetails(value, parentKey = "") {
  if (Array.isArray(value)) {
    return value.map((item) => redactProviderIdentityFromDetails(item, parentKey));
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && customerMessageKeys.has(normalizeDisclosureKey(parentKey))) {
      return redactProviderIdentityText(value);
    }
    return value;
  }

  const safeValue = {};
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = normalizeDisclosureKey(key);
    if (customerSecretKeys.has(normalizedKey)) continue;
    if (customerProviderIdentityKeys.has(normalizedKey) && isKnownUpstreamProvider(item)) continue;
    safeValue[key] = redactProviderIdentityFromDetails(item, key);
  }
  return safeValue;
}

function normalizeDisclosureKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isKnownUpstreamProvider(value) {
  return /(?:ao\s*pay|aopay|verifyal|satmat|recharge\s*kit|rechargkit|payprime|total\s*e?kyc|smartauth|indisign|algebra\s*softech)/i.test(String(value || ""));
}

function redactProviderIdentityText(value) {
  return String(value || "")
    .replace(/\bAO\s*Pay\b/gi, "upstream provider")
    .replace(/\bVerifyal\b/gi, "upstream provider")
    .replace(/\bSatmat\b/gi, "upstream provider")
    .replace(/\bRecharge\s*Kit\b|\bRechargKit\b/gi, "upstream provider")
    .replace(/\bPayPrime\b/gi, "upstream provider")
    .replace(/\bTotal\s*e?KYC\b/gi, "upstream provider")
    .replace(/\bSmartAuth\b/gi, "upstream provider")
    .replace(/\bIndiSign\b/gi, "upstream provider")
    .replace(/\bAlgebra\s*Softech\b/gi, "upstream provider");
}

function isValidDdMmYyyy(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || "").trim());
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    year <= new Date().getUTCFullYear() &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
