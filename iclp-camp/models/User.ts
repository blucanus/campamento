import mongoose, { Schema, models, model } from "mongoose";

export type UserRole = "superadmin" | "admin";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    role: { type: String, enum: ["superadmin", "admin"], default: "admin", index: true },
    passwordHash: { type: String, required: true },

    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    minimize: false,
    timestamps: true, // ✅ crea createdAt y updatedAt automáticamente
  }
);

export const User = models.User || model("User", UserSchema);
