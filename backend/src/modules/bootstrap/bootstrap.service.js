import { listNotificationsForUser } from "../activity/activity.service.js";
import { getDashboardForUser } from "../dashboard/dashboard.service.js";

export async function getBootstrapForUser(user) {
  const [dashboard, notifications] = await Promise.all([
    getDashboardForUser(user),
    listNotificationsForUser(user)
  ]);

  return {
    dashboard,
    notifications
  };
}
