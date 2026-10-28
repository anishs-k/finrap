import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ["cashfree", "plan_purchase", "api_usage", "system"],
      required: true,
      index: true
    },
    amountPaise: {
      type: Number,
      default: 0
    },
    connectsDeltaUnits: {
      type: Number,
      required: true
    },
    balanceAfterUnits: {
      type: Number,
      required: true
    },
    reference: {
      type: String,
      default: "",
      index: true
    },
    description: {
      type: String,
      default: ""
    },
    invoiceId: {
      type: String,
      default: ""
    },
    invoiceViewUrl: {
      type: String,
      default: ""
    },
    invoiceDownloadUrl: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

walletTransactionSchema.index({ createdAt: -1 });
walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ source: 1, reference: 1 });

export const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);
