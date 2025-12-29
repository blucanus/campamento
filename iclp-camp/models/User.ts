import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ["admin", "staff"], default: "admin" }
}, { timestamps: true });

export const User = models.User || model("User", UserSchema);

