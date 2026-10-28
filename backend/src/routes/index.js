import { Router } from "express";
import activityRoutes from "../modules/activity/activity.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import bootstrapRoutes from "../modules/bootstrap/bootstrap.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";
import inviteRoutes from "../modules/invites/invite.routes.js";
import kycRoutes from "../modules/kyc/kyc.routes.js";
import planRoutes from "../modules/plans/plan.routes.js";
import publicApiRoutes from "../modules/public-api/public-api.routes.js";
import reportRoutes from "../modules/reports/report.routes.js";
import systemRoutes from "../modules/system/system.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import verificationRoutes from "../modules/verification/verification.routes.js";
import walletRoutes from "../modules/wallet/wallet.routes.js";
import tuJsonPdfRoutes from "../modules/tu-json-pdf/tu-json-pdf.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/bootstrap", bootstrapRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/users", userRoutes);
router.use("/invites", inviteRoutes);
router.use("/kyc", kycRoutes);
router.use("/plans", planRoutes);
router.use("/public-api", publicApiRoutes);
router.use("/reports", reportRoutes);
router.use("/wallet", walletRoutes);
router.use("/system", systemRoutes);
router.use("/activity", activityRoutes);
router.use("/verify", verificationRoutes);
router.use("/tu-json-pdf", tuJsonPdfRoutes);

export default router;
