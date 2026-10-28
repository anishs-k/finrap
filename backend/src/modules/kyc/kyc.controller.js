import { asyncHandler } from "../../utils/async-handler.js";
import { sendOk } from "../../utils/response.js";
import { toUserDto } from "../../utils/sanitize.js";
import { approveKyc, refreshEsignStatus, refreshUserEsignStatus, rejectKyc, submitAadhaar, submitEsign, submitPan } from "./kyc.service.js";

export const verifyAadhaar = asyncHandler(async (req, res) => {
  await submitAadhaar({ user: req.user, aadhaarNumber: req.body.aadhaarNumber });
  sendOk(res, { user: toUserDto(req.user) });
});

export const verifyPan = asyncHandler(async (req, res) => {
  await submitPan({
    user: req.user,
    panNumber: req.body.panNumber,
    fullName: req.body.fullName,
    dob: req.body.dob
  });
  sendOk(res, { user: toUserDto(req.user) });
});

export const createEsign = asyncHandler(async (req, res) => {
  await submitEsign({
    user: req.user,
    phone: req.body.phone
  });
  sendOk(res, { user: toUserDto(req.user) });
});

export const checkEsignStatus = asyncHandler(async (req, res) => {
  await refreshEsignStatus({ user: req.user });
  sendOk(res, { user: toUserDto(req.user) });
});

export const checkUserEsignStatus = asyncHandler(async (req, res) => {
  const result = await refreshUserEsignStatus({ admin: req.user, userId: req.params.userId });
  sendOk(res, result);
});

export const approveUserKyc = asyncHandler(async (req, res) => {
  const result = await approveKyc({ admin: req.user, userId: req.params.userId });
  sendOk(res, result);
});

export const rejectUserKyc = asyncHandler(async (req, res) => {
  const result = await rejectKyc({
    admin: req.user,
    userId: req.params.userId,
    reason: req.body.reason,
    issues: req.body.issues
  });
  sendOk(res, result);
});
