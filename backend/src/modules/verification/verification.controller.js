import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendOk } from "../../utils/response.js";
import { createVerification, downloadEsignAuditTrailForVerification, downloadEsignSignedDocumentForVerification, getVerificationDetail, listVerifications, refreshEsignVerificationStatus, shareEConsentForVerification } from "./verification.service.js";

export const listServiceVerifications = asyncHandler(async (req, res) => {
  const results = await listVerifications({
    user: req.user,
    service: req.params.service,
    query: req.query
  });

  sendOk(res, results);
});

export const getServiceVerification = asyncHandler(async (req, res) => {
  const result = await getVerificationDetail({
    user: req.user,
    service: req.params.service,
    verificationId: req.params.verificationId
  });

  sendOk(res, result);
});

export const submitVerification = asyncHandler(async (req, res) => {
  const result = await createVerification({
    user: req.user,
    service: req.params.service,
    customerName: req.body.customerName,
    firstName: req.body.firstName || req.body.first_name,
    middleName: req.body.middleName || req.body.middle_name,
    lastName: req.body.lastName || req.body.last_name,
    remark: req.body.remark,
    identifier: req.body.identifier,
    email: req.body.email,
    dob: req.body.dob,
    mobile: req.body.mobile,
    documentTitle: req.body.documentTitle,
    documentFileName: req.body.documentFileName,
    documentFileDataUrl: req.body.documentFileDataUrl,
    successRedirectUrl: req.body.successRedirectUrl || req.body.success_redirect_url,
    errorRedirectUrl: req.body.errorRedirectUrl || req.body.error_redirect_url,
    location: req.body.location,
    date: req.body.date,
    otp: req.body.otp,
    requestId: req.body.requestId || req.body.request_id,
    gender: req.body.gender,
    address: req.body.address,
    state: req.body.state,
    stateCode: req.body.stateCode || req.body.state_code,
    pincode: req.body.pincode,
    ifsc: req.body.ifsc || req.body.ifsc_code || req.body.ifscCode,
    selfieFileName: req.body.selfieFileName || req.body.selfie_file_name,
    selfieFileDataUrl: req.body.selfieFileDataUrl || req.body.selfie_file,
    cardImageFileName: req.body.cardImageFileName || req.body.card_image_file_name,
    cardImageFileDataUrl: req.body.cardImageFileDataUrl || req.body.card_image
  });

  sendCreated(res, result);
});

export const fetchEsignStatus = asyncHandler(async (req, res) => {
  const result = await refreshEsignVerificationStatus({
    user: req.user,
    verificationId: req.params.verificationId,
    service: req.params.service
  });

  sendOk(res, result);
});

export const downloadEsignAuditTrail = asyncHandler(async (req, res) => {
  const trail = await downloadEsignAuditTrailForVerification({
    user: req.user,
    verificationId: req.params.verificationId,
    service: req.params.service
  });

  res.setHeader("Content-Type", trail.contentType || "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${trail.fileName || "econsent-audit-trail.pdf"}"`);
  res.send(trail.buffer || Buffer.from(""));
});

export const downloadEsignSignedDocument = asyncHandler(async (req, res) => {
  const document = await downloadEsignSignedDocumentForVerification({
    user: req.user,
    verificationId: req.params.verificationId,
    service: req.params.service
  });

  res.setHeader("Content-Type", document.contentType || "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${document.fileName || "econsent-signed-document.pdf"}"`);
  res.send(document.buffer || Buffer.from(""));
});

export const shareEConsent = asyncHandler(async (req, res) => {
  const result = await shareEConsentForVerification({
    user: req.user,
    verificationId: req.params.verificationId,
    service: req.params.service
  });

  sendOk(res, result);
});
