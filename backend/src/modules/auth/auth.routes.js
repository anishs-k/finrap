import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { forgotPassword, login, logout, me, resetPassword, verifyForgotPassword } from "./auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/forgot-password/request", forgotPassword);
router.post("/forgot-password/verify", verifyForgotPassword);
router.post("/forgot-password/reset", resetPassword);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

export default router;
