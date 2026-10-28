import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { addPlan, buyPlan, editPlan, listPlans, removePlan } from "./plan.controller.js";

const router = Router();

router.get("/", requireAuth, listPlans);
router.post("/", requireAuth, addPlan);
router.post("/purchase", requireAuth, buyPlan);
router.patch("/:planId", requireAuth, editPlan);
router.delete("/:planId", requireAuth, removePlan);

export default router;
