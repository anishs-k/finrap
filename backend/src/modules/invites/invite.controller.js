import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendOk } from "../../utils/response.js";
import { createInvite, listInvitesForUser } from "./invite.service.js";

export const listInvites = asyncHandler(async (req, res) => {
  const invites = await listInvitesForUser(req.user);
  sendOk(res, invites);
});

export const inviteUser = asyncHandler(async (req, res) => {
  const { invite } = await createInvite({
    user: req.user,
    name: req.body.name,
    email: req.body.email,
    targetRole: req.body.targetRole,
    permissions: req.body.permissions,
    password: req.body.password,
    roadStreet: req.body.roadStreet,
    pincode: req.body.pincode,
    stateCode: req.body.stateCode,
    gstin: req.body.gstin,
    pan: req.body.pan,
    contact: req.body.contact
  });

  sendCreated(res, invite);
});
