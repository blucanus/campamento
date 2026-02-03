import mongoose from "mongoose";

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    role: {
      type: String,
      enum: ["superadmin", "admin", "viewer"],
      default: "admin",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const AdminUser =
  mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);
