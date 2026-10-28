import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { inviteUser, listInvites } from "./invite.controller.js";

const router = Router();

router.get("/", requireAuth, listInvites);
router.post("/", requireAuth, inviteUser);

export default router;
