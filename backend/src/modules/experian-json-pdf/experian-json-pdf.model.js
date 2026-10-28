import mongoose from "mongoose";

const experianJsonPdfDocumentSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    verificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Verification", default: null, index: true },
    customerName: { type: String, required: true, trim: true, index: true },
    score: { type: Number, default: null },
    accountCount: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },
    reportNumber: { type: String, default: "", index: true },
    pageCount: { type: Number, default: 1 },
    fileName: { type: String, required: true },
    contentType: { type: String, default: "application/pdf" },
    pdfData: { type: Buffer, required: true }
  },
  { timestamps: true, versionKey: false }
);

experianJsonPdfDocumentSchema.index({ actorId: 1, createdAt: -1 });
experianJsonPdfDocumentSchema.index({ createdAt: -1 });

export const ExperianJsonPdfDocument = mongoose.model(
  "ExperianJsonPdfDocument",
  experianJsonPdfDocumentSchema
);
