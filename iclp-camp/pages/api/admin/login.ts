import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { signToken, setCookie } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, pass } = req.body || {};
  if (!email || !pass) return res.status(400).json({ error: "Missing credentials" });

  await connectDB();

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(401).json({ error: "Usuario o clave incorrectos" });
  if (!user.isActive) return res.status(401).json({ error: "Usuario deshabilitado" });

  const ok = await bcrypt.compare(String(pass), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Usuario o clave incorrectos" });

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken({ id: String(user._id), email: user.email, role: user.role });
  setCookie(res, token);

  res.json({ ok: true, role: user.role });
}
