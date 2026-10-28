import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendOk } from "../../utils/response.js";
import { generateTuJsonPdf, getTuJsonPdfFile, listTuJsonPdfDocuments } from "./tu-json-pdf.service.js";

export const convertTuJsonToPdf = asyncHandler(async (req, res) => {
  return sendCreated(res, await generateTuJsonPdf(req.user, req.body?.payload || req.body));
});

export const listGeneratedTuPdfs = asyncHandler(async (req, res) => {
  return sendOk(res, await listTuJsonPdfDocuments(req.user, req.query));
});

export const readGeneratedTuPdf = asyncHandler(async (req, res) => {
  const file = await getTuJsonPdfFile(req.user, req.params.documentId);
  const disposition = req.query.download === "1" ? "attachment" : "inline";
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Length", file.bytes.length);
  res.setHeader("Content-Disposition", `${disposition}; filename="${file.fileName.replace(/"/g, "")}"`);
  return res.send(file.bytes);
});
