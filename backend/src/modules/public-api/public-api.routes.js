import { Router } from "express";
import { authorizePublicApiToken, logPublicApiUsage, refundPublicApiUsage, renderPublicExperianPdf, renderPublicTuPdf, reservePublicApiUsage } from "./public-api.controller.js";

const router = Router();

router.post("/authorize", authorizePublicApiToken);
router.post("/reserve", reservePublicApiUsage);
router.post("/refund", refundPublicApiUsage);
router.post("/log", logPublicApiUsage);
router.post("/experian-pdf/render", renderPublicExperianPdf);
router.post("/tu-cibil-pdf/render", renderPublicTuPdf);

export default router;
