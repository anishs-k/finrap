import mongoose from "mongoose";
import { DEFAULT_PUBLIC_API_PRICING, ROLE_DEFAULT_PERMISSIONS } from "../../constants/permissions.js";
import { ACCOUNT_STATUS, KYC_STATUS, PLAN_STATUS, ROLE_VALUES } from "../../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true
    },
    roadStreet: {
      type: String,
      default: "",
      trim: true
    },
    pincode: {
      type: String,
      default: "",
      trim: true
    },
    stateCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true
    },
    gstin: {
      type: String,
      default: "",
      uppercase: true,
      trim: true
    },
    pan: {
      type: String,
      default: "",
      uppercase: true,
      trim: true
    },
    contact: {
      type: String,
      default: "",
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
      index: true
    },
    planStatus: {
      type: String,
      enum: Object.values(PLAN_STATUS),
      default: PLAN_STATUS.INACTIVE
    },
    kycStatus: {
      type: String,
      enum: Object.values(KYC_STATUS),
      default: KYC_STATUS.NOT_STARTED,
      index: true
    },
    kyc: {
      aadhaar: {
        status: { type: String, default: "" },
        number: { type: String, default: "" },
        maskedNumber: { type: String, default: "" },
        lastDigits: { type: String, default: "" },
        clientId: { type: String, default: "" },
        ageRange: { type: String, default: "" },
        state: { type: String, default: "" },
        gender: { type: String, default: "" },
        isMobile: { type: Boolean, default: false },
        mobileLastDigits: { type: String, default: "" },
        remarks: { type: String, default: "" },
        providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },
        verifiedAt: { type: Date, default: null }
      },
      esign: {
        status: { type: String, default: "" },
        phone: { type: String, default: "" },
        providerReference: { type: String, default: "" },
        providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },
        requestedAt: { type: Date, default: null },
        signedAt: { type: Date, default: null }
      },
      pan: {
        status: { type: String, default: "" },
        number: { type: String, default: "" },
        maskedNumber: { type: String, default: "" },
        clientId: { type: String, default: "" },
        name: { type: String, default: "" },
        dob: { type: String, default: "" },
        category: { type: String, default: "" },
        providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },
        verifiedAt: { type: Date, default: null }
      },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      rejectionReason: { type: String, default: "" },
      rejectionIssues: {
        aadhaar: {
          selected: { type: Boolean, default: false },
          reason: { type: String, default: "" }
        },
        pan: {
          selected: { type: Boolean, default: false },
          reason: { type: String, default: "" }
        },
        esign: {
          selected: { type: Boolean, default: false },
          reason: { type: String, default: "" }
        }
      }
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    walletBalanceUnits: {
      type: Number,
      default: 0,
      min: 0
    },
    permissions: {
      type: [String],
      default() {
        return ROLE_DEFAULT_PERMISSIONS[this.role] || [];
      }
    },
    publicApiToken: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    whiteLabelApiDomain: {
      type: String,
      default: "",
      trim: true
    },
    issuedPassword: {
      type: String,
      default: "",
      trim: true
    },
    apiPricing: {
      tuCibilPdf: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.tuCibilPdf },
      tuCibilJson: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.tuCibilJson },
      equifaxCibilPdf: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.equifaxCibilPdf },
      equifaxCibilJson: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.equifaxCibilJson },
      crifPdf: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.crifPdf },
      crifJson: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.crifJson },
      panFullDetail: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.panFullDetail },
      aadhaarValidation: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.aadhaarValidation },
      aadhaarOtp: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.aadhaarOtp },
      uanFetchByPan: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.uanFetchByPan },
      uanProfileDetails: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.uanProfileDetails },
      employmentHistory: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.employmentHistory },
      epfoPassbook: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.epfoPassbook },
      gstinVerification: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.gstinVerification },
      bankVerification: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.bankVerification },
      drivingLicense: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.drivingLicense },
      rcBasic: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.rcBasic },
      experianJson: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.experianJson },
      experianPdf: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.experianPdf },
      faceMatch: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.faceMatch },
      mcaCompany: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.mcaCompany },
      prefill: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.prefill },
      esign: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.esign },
      econsent: { type: Number, default: DEFAULT_PUBLIC_API_PRICING.econsent }
    },
    currentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    passwordResetLastSentAt: {
      type: Date,
      default: null
    },
    passwordResetOtpHash: {
      type: String,
      default: ""
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      default: null
    },
    passwordResetTokenHash: {
      type: String,
      default: ""
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ parent: 1, createdAt: -1 });
userSchema.index({ invitedBy: 1, createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ kycStatus: 1, createdAt: -1 });
userSchema.index({ deletedAt: 1, createdAt: -1 });

export const User = mongoose.model("User", userSchema);
