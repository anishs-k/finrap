import mongoose from "mongoose";

const tuJsonPdfDocumentSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    customerName: { type: String, required: true, trim: true, index: true },
    score: { type: Number, default: null },
    accountCount: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },
    controlNumber: { type: String, default: "", index: true },
    sourceSchema: { type: String, required: true },
    pageCount: { type: Number, default: 1 },
    fileName: { type: String, required: true },
    contentType: { type: String, default: "application/pdf" },
    providerRequest: { type: mongoose.Schema.Types.Mixed, default: null },
    providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    pdfData: { type: Buffer, required: true }
  },
  { timestamps: true, versionKey: false }
);

tuJsonPdfDocumentSchema.index({ actorId: 1, createdAt: -1 });
tuJsonPdfDocumentSchema.index({ createdAt: -1 });

export const TuJsonPdfDocument = mongoose.model("TuJsonPdfDocument", tuJsonPdfDocumentSchema);
