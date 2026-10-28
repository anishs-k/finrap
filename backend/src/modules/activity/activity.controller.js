import { asyncHandler } from "../../utils/async-handler.js";
import { sendOk } from "../../utils/response.js";
import { listActivityForUser, listNotificationsForUser, markAllNotificationsRead, markNotificationRead } from "./activity.service.js";

export const listActivity = asyncHandler(async (req, res) => {
  const activity = await listActivityForUser(req.user, req.query);
  sendOk(res, activity);
});

export const listNotifications = asyncHandler(async (req, res) => {
  sendOk(res, await listNotificationsForUser(req.user, req.query));
});

export const readNotification = asyncHandler(async (req, res) => {
  sendOk(res, await markNotificationRead({ user: req.user, notificationId: req.params.notificationId }));
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  sendOk(res, await markAllNotificationsRead(req.user));
});
