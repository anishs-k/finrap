import mongoose from "mongoose";
import { ROLE_VALUES } from "../../constants/roles.js";

const inviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    targetRole: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    senderRole: {
      type: String,
      enum: ROLE_VALUES,
      required: true
    },
    status: {
      type: String,
      enum: ["sent", "accepted", "revoked"],
      default: "sent",
      index: true
    },
    permissions: {
      type: [String],
      default: []
    },
    tokenHash: {
      type: String,
      required: true,
      select: false
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Invite = mongoose.model("Invite", inviteSchema);
