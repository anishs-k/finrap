import mongoose from "mongoose";
import { ROLE_VALUES } from "../../constants/roles.js";

const verificationSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      enum: [
        "PAN",
        "AADHAAR",
        "AADHAAR_VALIDATION",
        "AADHAAR_OTP",
        "ESIGN",
        "ECONSENT",
        "CIBIL",
        "CIBIL_JSON",
        "EQUIFAX",
        "EQUIFAX_JSON",
        "CRIF",
        "CRIF_JSON",
        "UAN_FETCH_BY_PAN",
        "UAN_PROFILE_DETAILS",
        "EMPLOYMENT_HISTORY",
        "EPFO_PASSBOOK",
        "GSTIN",
        "BANK_VERIFICATION",
        "DRIVING_LICENSE",
        "RC_BASIC",
        "EXPERIAN_CREDIT_REPORT",
        "EXPERIAN_JSON",
        "EXPERIAN_PDF",
        "FACE_MATCH",
        "MCA_COMPANY",
        "PREFILL"
      ],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
      index: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    identifierMasked: {
      type: String,
      required: true
    },
    panNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true
    },
    mobileNumber: {
      type: String,
      default: "",
      trim: true
    },
    score: {
      type: Number,
      default: null
    },
    riskBand: {
      type: String,
      default: "Pending"
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    actorRole: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
      index: true
    },
    providerReference: {
      type: String,
      default: null
    },
    rawProviderStatus: {
      type: String,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reportFileBase64: {
      type: String,
      default: ""
    },
    reportContentType: {
      type: String,
      default: ""
    },
    reportFileName: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

verificationSchema.index({ createdAt: -1 });
verificationSchema.index({ actor: 1, createdAt: -1 });
verificationSchema.index({ actor: 1, service: 1, createdAt: -1 });
verificationSchema.index({ service: 1, createdAt: -1 });
verificationSchema.index({ providerReference: 1 });

export const Verification = mongoose.model("Verification", verificationSchema);
