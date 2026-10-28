import { asyncHandler } from "../../utils/async-handler.js";
import { sendOk } from "../../utils/response.js";
import { getDashboardForUser } from "./dashboard.service.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getDashboardForUser(req.user);
  sendOk(res, dashboard);
});
