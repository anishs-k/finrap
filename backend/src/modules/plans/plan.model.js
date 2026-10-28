import mongoose from "mongoose";
import { ROLE_VALUES, SERVICES } from "../../constants/roles.js";

const planSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    ownerRole: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
      index: true
    },
    audienceRole: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
      index: true
    },
    audienceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    },
    credits: {
      type: Number,
      default: 0,
      min: 0
    },
    services: {
      type: [String],
      enum: SERVICES,
      default: []
    },
    serviceRates: {
      type: [
        {
          service: {
            type: String,
            enum: SERVICES,
            required: true
          },
          cost: {
            type: Number,
            required: true,
            min: 0
          }
        }
      ],
      default: []
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    purchaseCount: {
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

planSchema.index({ active: 1, createdAt: -1 });
planSchema.index({ owner: 1, active: 1, createdAt: -1 });
planSchema.index({ audienceRole: 1, active: 1, createdAt: -1 });
planSchema.index({ audienceUser: 1, active: 1, createdAt: -1 });

export const Plan = mongoose.model("Plan", planSchema);
