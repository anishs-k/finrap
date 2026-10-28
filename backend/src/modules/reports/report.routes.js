import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { exportUsageReport, usageReport } from "./report.controller.js";

const router = Router();

router.get("/usage", requireAuth, usageReport);
router.get("/usage/export", requireAuth, exportUsageReport);

export default router;
