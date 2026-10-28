import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendOk } from "../../utils/response.js";
import { toUserDto } from "../../utils/sanitize.js";
import { createPlan, deletePlan, listPlansForUser, purchasePlan, updatePlan } from "./plan.service.js";

export const listPlans = asyncHandler(async (req, res) => {
  const plans = await listPlansForUser(req.user, req.query);
  sendOk(res, plans);
});

export const addPlan = asyncHandler(async (req, res) => {
  const plan = await createPlan({
    user: req.user,
    audienceRole: req.body.audienceRole,
    audienceUser: req.body.audienceUser,
    name: req.body.name,
    services: req.body.services || [],
    serviceRates: req.body.serviceRates || []
  });

  sendCreated(res, plan);
});

export const editPlan = asyncHandler(async (req, res) => {
  const plan = await updatePlan({
    user: req.user,
    planId: req.params.planId,
    name: req.body.name,
    audienceUser: req.body.audienceUser,
    services: req.body.services,
    serviceRates: req.body.serviceRates
  });

  sendOk(res, plan);
});

export const removePlan = asyncHandler(async (req, res) => {
  sendOk(res, await deletePlan({ user: req.user, planId: req.params.planId }));
});

export const buyPlan = asyncHandler(async (req, res) => {
  const result = await purchasePlan({ user: req.user, planId: req.body.planId });
  sendOk(res, { user: toUserDto(result.user, result.wallet), plan: result.plan });
});
