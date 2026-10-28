import crypto from "node:crypto";
import mongoose from "mongoose";

function createWalletKey() {
  return `wal_${crypto.randomBytes(12).toString("hex")}`;
}

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    walletKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: createWalletKey
    },
    balanceUnits: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Wallet = mongoose.model("Wallet", walletSchema);
