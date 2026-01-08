import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");


const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: "admin" }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

await mongoose.connect(uri);

const email = "admin@iclp.test";
const exists = await User.findOne({ email });
if (!exists) {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await User.create({ name: "Admin", email, passwordHash, role: "admin" });
  console.log("✅ Admin creado:", email, "pass: admin123");
} else {
  console.log("ℹ️ Admin ya existe:", email);
}

await mongoose.disconnect();
