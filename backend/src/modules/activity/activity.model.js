import mongoose from "mongoose";
import { ROLE_VALUES } from "../../constants/roles.js";

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    actorName: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true
    },
    service: {
      type: String,
      required: true,
      index: true
    },
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    notifyUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ role: 1, createdAt: -1 });
activitySchema.index({ notifyUsers: 1, createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);
