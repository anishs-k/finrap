import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { forbidden } from "../../utils/http-error.js";
import { hasPermission } from "../../utils/permissions.js";
import { convertTuJsonToPdf, listGeneratedTuPdfs, readGeneratedTuPdf } from "./tu-json-pdf.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/documents", requirePanelPermission("cibilJson.view"), listGeneratedTuPdfs);
router.get("/documents/:documentId", requirePanelPermission("cibilJson.view"), readGeneratedTuPdf);
router.post("/convert", requirePanelPermission("cibilJson.generate"), convertTuJsonToPdf);

function requirePanelPermission(permission) {
  return function permissionMiddleware(req, _res, next) {
    if (hasPermission(req.user, permission)) return next();
    return next(forbidden("You do not have permission to use TU JSON to PDF."));
  };
}

export default router;
