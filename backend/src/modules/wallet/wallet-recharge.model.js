import mongoose from "mongoose";

const walletRechargeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 100
    },
    payableAmountPaise: {
      type: Number,
      default: 0,
      min: 0
    },
    gstRate: {
      type: Number,
      default: 18,
      min: 0
    },
    gstAmountPaise: {
      type: Number,
      default: 0,
      min: 0
    },
    walletCreditAmountPaise: {
      type: Number,
      default: 0,
      min: 0
    },
    roundingAdjustmentPaise: {
      type: Number,
      default: 0
    },
    ratePaisePerConnect: {
      type: Number,
      required: true,
      min: 1
    },
    connectsUnits: {
      type: Number,
      required: true,
      min: 1
    },
    paymentProvider: {
      type: String,
      default: "cashfree"
    },
    providerOrderId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      index: true
    },
    providerPaymentId: {
      type: String,
      unique: true,
      sparse: true
    },
    status: {
      type: String,
      enum: ["created", "processing", "paid", "failed"],
      default: "created",
      index: true
    },
    failureReason: {
      type: String,
      default: ""
    },
    paidAt: {
      type: Date,
      default: null
    },
    billingInvoiceStatus: {
      type: String,
      enum: ["pending", "processing", "created", "failed"],
      default: "pending",
      index: true
    },
    billingInvoiceId: {
      type: String,
      default: "",
      index: true
    },
    billingInvoiceViewUrl: {
      type: String,
      default: ""
    },
    billingInvoiceDownloadUrl: {
      type: String,
      default: ""
    },
    billingInvoiceFileName: {
      type: String,
      default: ""
    },
    billingInvoiceContentType: {
      type: String,
      default: ""
    },
    billingInvoicePdf: {
      type: Buffer,
      default: null
    },
    billingInvoiceStoredAt: {
      type: Date,
      default: null
    },
    billingInvoiceError: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const WalletRecharge = mongoose.model("WalletRecharge", walletRechargeSchema);
