import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { downloadEsignAuditTrail, downloadEsignSignedDocument, fetchEsignStatus, getServiceVerification, listServiceVerifications, shareEConsent, submitVerification } from "./verification.controller.js";

const router = Router();

router.post("/:service/:verificationId/status", requireAuth, fetchEsignStatus);
router.post("/:service/:verificationId/share", requireAuth, shareEConsent);
router.get("/:service/:verificationId/signed-document", requireAuth, downloadEsignSignedDocument);
router.get("/:service/:verificationId/audit-trail", requireAuth, downloadEsignAuditTrail);
router.get("/:service/:verificationId", requireAuth, getServiceVerification);
router.get("/:service", requireAuth, listServiceVerifications);
router.post("/:service", requireAuth, submitVerification);

export default router;
