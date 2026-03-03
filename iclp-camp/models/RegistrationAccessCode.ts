import { Schema, model, models } from "mongoose";

const RegistrationAccessCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    note: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const RegistrationAccessCode =
  models.RegistrationAccessCode || model("RegistrationAccessCode", RegistrationAccessCodeSchema);

