import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { bootstrap } from "./bootstrap.controller.js";

const router = Router();

router.get("/", requireAuth, bootstrap);

export default router;
