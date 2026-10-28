import { Activity } from "./activity.model.js";
import { visibleActivityFilter } from "../../utils/permissions.js";
import { KYC_STATUS, ROLES } from "../../constants/roles.js";
import { parsePagination, runPaginatedQuery } from "../../utils/pagination.js";
import { dateSearchClauses, roleSearchValues, searchPattern } from "../../utils/list-search.js";
import { User } from "../users/user.model.js";

export async function recordActivity({ user, action, service, notifyUsers = [], notifySuperAdmins = false }) {
  const notificationRecipients = await buildNotificationRecipients({ notifyUsers, notifySuperAdmins });
  return Activity.create({
    actor: user?._id || null,
    actorName: user?.name || "System",
    role: user?.role || "super_admin",
    action,
    service,
    notifyUsers: notificationRecipients
  });
}

export async function listActivityForUser(user, query = {}) {
  const filter = withActivityDateRange(withActivitySearch(visibleActivityFilter(user), query.search), query);
  const pagination = parsePagination(query, { defaultLimit: 50, maxLimit: 200 });
  const activityQuery = Activity.find(filter).sort({ createdAt: -1 });
  const limitedQuery = pagination.enabled ? activityQuery : activityQuery.limit(50);
  return runPaginatedQuery({
    query: limitedQuery,
    countQuery: Activity.countDocuments(filter),
    pagination,
    mapper: toActivityDto
  });
}

function withActivityDateRange(filter, query = {}) {
  const createdAt = {};
  const from = parseDateStart(query.dateFrom);
  const to = parseDateEnd(query.dateTo);

  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;

  if (Object.keys(createdAt).length === 0) return filter;
  return { $and: [filter, { createdAt }] };
}

function parseDateStart(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function withActivitySearch(filter, search) {
  const term = String(search || "").trim();
  if (!term) return filter;

  const pattern = searchPattern(term);
  const matchedRoles = roleSearchValues(term);
  return {
    $and: [
      filter,
      {
        $or: [
          { actorName: pattern },
          { actorEmail: pattern },
          { role: pattern },
          ...(matchedRoles.length > 0 ? [{ role: { $in: matchedRoles } }] : []),
          { action: pattern },
          { service: pattern },
          ...dateSearchClauses("createdAt", term)
        ]
      }
    ]
  };
}

export async function listNotificationsForUser(user, query = {}) {
  if (user.role !== "super_admin" && user.kycStatus !== KYC_STATUS.VERIFIED && user.kycStatus !== KYC_STATUS.NOT_REQUIRED) {
    return [];
  }

  const filter = { notifyUsers: user._id };
  const pagination = parsePagination(query, { defaultLimit: 30, maxLimit: 100 });
  const notificationsQuery = Activity.find(filter).sort({ createdAt: -1 });
  const limitedQuery = pagination.enabled ? notificationsQuery : notificationsQuery.limit(30);
  return runPaginatedQuery({
    query: limitedQuery,
    countQuery: Activity.countDocuments(filter),
    pagination,
    mapper: (item) => toNotificationDto(item, user)
  });
}

export async function markNotificationRead({ user, notificationId }) {
  await Activity.updateOne({ _id: notificationId, notifyUsers: user._id }, { $addToSet: { readBy: user._id } });
  return { ok: true };
}

export async function markAllNotificationsRead(user) {
  await Activity.updateMany({ notifyUsers: user._id }, { $addToSet: { readBy: user._id } });
  return { ok: true };
}

export function toActivityDto(activity) {
  return {
    id: String(activity._id),
    actor: activity.actorName,
    role: activity.role,
    action: activity.action,
    service: activity.service,
    createdAt: activity.createdAt
  };
}

function toNotificationDto(activity, user) {
  return {
    ...toActivityDto(activity),
    read: (activity.readBy || []).some((id) => String(id) === String(user._id))
  };
}

async function buildNotificationRecipients({ notifyUsers, notifySuperAdmins }) {
  const recipients = new Set(
    (Array.isArray(notifyUsers) ? notifyUsers : [])
      .filter(Boolean)
      .map((id) => String(id))
  );

  if (notifySuperAdmins) {
    const admins = await User.find({ role: ROLES.SUPER_ADMIN }).select("_id");
    admins.forEach((admin) => recipients.add(String(admin._id)));
  }

  return [...recipients];
}
