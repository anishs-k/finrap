import { asyncHandler } from "../../utils/async-handler.js";
import { sendOk } from "../../utils/response.js";
import { getBootstrapForUser } from "./bootstrap.service.js";

export const bootstrap = asyncHandler(async (req, res) => {
  sendOk(res, await getBootstrapForUser(req.user));
});
