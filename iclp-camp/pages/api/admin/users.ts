import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminUser } from "@/models/AdminUser";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  if (req.method === "POST") {
    const { email, password, name, role } = req.body || {};

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();

    if (!cleanEmail || !cleanPass) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const exists = await AdminUser.findOne({ email: cleanEmail }).lean();
    if (exists) return res.status(400).json({ error: "Ya existe un usuario con ese email" });

    const passwordHash = await bcrypt.hash(cleanPass, 10);

    const doc = await AdminUser.create({
      email: cleanEmail,
      passwordHash,
      name: String(name || "").trim(),
      role: String(role || "admin").trim(),
      isActive: true,
    });

    return res.status(200).json({ ok: true, id: String(doc._id), email: doc.email });
  }

  if (req.method === "GET") {
    const users = await AdminUser.find({})
      .sort({ createdAt: -1 })
      .select("email name role isActive createdAt")
      .lean();

    return res.status(200).json(
      users.map((u: any) => ({
        id: String(u._id),
        email: u.email,
        name: u.name || "",
        role: u.role || "admin",
        isActive: !!u.isActive,
        createdAt: u.createdAt,
      }))
    );
  }

  return res.status(405).end();
}
