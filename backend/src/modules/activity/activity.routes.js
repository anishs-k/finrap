import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { listActivity, listNotifications, readAllNotifications, readNotification } from "./activity.controller.js";

const router = Router();

router.get("/", requireAuth, listActivity);
router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/read-all", requireAuth, readAllNotifications);
router.post("/notifications/:notificationId/read", requireAuth, readNotification);

export default router;
