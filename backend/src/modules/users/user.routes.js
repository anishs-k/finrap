import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { deleteUser, listUsers, regenerateMeApiToken, updateMe, updatePassword, updatePermissions, updateStatus } from "./user.controller.js";

const router = Router();

router.get("/", requireAuth, listUsers);
router.patch("/me", requireAuth, updateMe);
router.post("/me/api-token", requireAuth, regenerateMeApiToken);
router.delete("/:userId", requireAuth, deleteUser);
router.patch("/:userId/permissions", requireAuth, updatePermissions);
router.patch("/:userId/status", requireAuth, updateStatus);
router.patch("/:userId/password", requireAuth, updatePassword);

export default router;
