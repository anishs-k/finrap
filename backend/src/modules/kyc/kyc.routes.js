import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { approveUserKyc, checkEsignStatus, checkUserEsignStatus, createEsign, rejectUserKyc, verifyAadhaar, verifyPan } from "./kyc.controller.js";

const router = Router();

router.post("/aadhaar", requireAuth, verifyAadhaar);
router.post("/esign", requireAuth, createEsign);
router.post("/esign/status", requireAuth, checkEsignStatus);
router.post("/pan", requireAuth, verifyPan);
router.post("/:userId/esign/status", requireAuth, checkUserEsignStatus);
router.post("/:userId/approve", requireAuth, approveUserKyc);
router.post("/:userId/reject", requireAuth, rejectUserKyc);

export default router;
