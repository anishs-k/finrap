import { asyncHandler } from "../../utils/async-handler.js";
import { sendOk } from "../../utils/response.js";
import { listUsersForUser, regeneratePublicApiToken, softDeleteUser, updateProfile, updateUserPassword, updateUserPermissions, updateUserStatus } from "./user.service.js";

export const listUsers = asyncHandler(async (req, res) => {
  const users = await listUsersForUser(req.user, req.query);
  sendOk(res, users);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user, req.body);
  sendOk(res, { user });
});

export const regenerateMeApiToken = asyncHandler(async (req, res) => {
  const user = await regeneratePublicApiToken(req.user);
  sendOk(res, { user });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const user = await updateUserStatus({
    admin: req.user,
    userId: req.params.userId,
    status: req.body.status
  });
  sendOk(res, { user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await softDeleteUser({
    admin: req.user,
    userId: req.params.userId
  });
  sendOk(res, result);
});

export const updatePermissions = asyncHandler(async (req, res) => {
  const user = await updateUserPermissions({
    admin: req.user,
    userId: req.params.userId,
    permissions: req.body.permissions
  });
  sendOk(res, { user });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const user = await updateUserPassword({
    admin: req.user,
    userId: req.params.userId,
    password: req.body.password
  });
  sendOk(res, { user });
});
