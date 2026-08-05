import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

const ROLES = ["superadmin", "admin", "staff"];

function cleanRoleOf(role: unknown) {
  const r = String(role || "");
  return ROLES.includes(r) ? r : "admin";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  // LISTAR (admin o superadmin)
  if (req.method === "GET") {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("email name role isActive lastLoginAt createdAt updatedAt")
      .lean();

    return res.status(200).json(
      (users as any[]).map(u => ({
        id: String(u._id),
        email: u.email,
        name: u.name || "",
        role: u.role,
        isActive: !!u.isActive,
        lastLoginAt: u.lastLoginAt || null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }))
    );
  }

  // CREAR (solo superadmin)
  if (req.method === "POST") {
    const superAdmin = requireSuperAdmin(req);
    if (!superAdmin) return res.status(403).json({ error: "Forbidden" });

    const { email, name, role, pass } = req.body || {};
    const mail = String(email || "").toLowerCase().trim();
    if (!mail || !String(pass || "")) return res.status(400).json({ error: "Email y clave son requeridos" });

    const cleanRole = cleanRoleOf(role);

    const exists = await User.findOne({ email: mail });
    if (exists) return res.status(400).json({ error: "Ya existe un usuario con ese email" });

    const passwordHash = await bcrypt.hash(String(pass), 10);

    const doc = await User.create({
      email: mail,
      name: String(name || "").trim(),
      role: cleanRole,
      passwordHash,
      isActive: true,
    });

    await auditLog({
      req,
      actor: superAdmin,
      action: "user.create",
      entity: "User",
      entityId: String(doc._id),
      meta: { email: mail, role: cleanRole },
    });

    return res.status(200).json({ ok: true, id: String(doc._id) });
  }

  // EDITAR (solo superadmin) - activar/desactivar, nombre, rol, reset pass
  if (req.method === "PUT") {
    const superAdmin = requireSuperAdmin(req);
    if (!superAdmin) return res.status(403).json({ error: "Forbidden" });

    const { id, name, role, isActive, newPass } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "No encontrado" });

    const before = {
      name: user.name || "",
      role: user.role,
      isActive: !!user.isActive,
    };

    if (typeof name !== "undefined") user.name = String(name || "").trim();
    if (typeof role !== "undefined") user.role = cleanRoleOf(role);
    if (typeof isActive !== "undefined") user.isActive = !!isActive;

    if (newPass) {
      user.passwordHash = await bcrypt.hash(String(newPass), 10);
    }

    await user.save();

    const after = {
      name: user.name || "",
      role: user.role,
      isActive: !!user.isActive,
      passReset: !!newPass,
    };

    await auditLog({
      req,
      actor: superAdmin,
      action: "user.update",
      entity: "User",
      entityId: String(user._id),
      meta: { before, after },
    });

    return res.status(200).json({ ok: true });
  }

  // ELIMINAR (solo superadmin)
  if (req.method === "DELETE") {
    const superAdmin = requireSuperAdmin(req);
    if (!superAdmin) return res.status(403).json({ error: "Forbidden" });

    const id = String(req.query.id || req.body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });
    if (id === superAdmin.id) {
      return res.status(400).json({ error: "No podés eliminar tu propio usuario." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "No encontrado" });

    // No dejamos el sistema sin superadmins.
    if (user.role === "superadmin") {
      const supers = await User.countDocuments({ role: "superadmin", isActive: true });
      if (supers <= 1) {
        return res.status(400).json({ error: "Tiene que quedar al menos un superadmin." });
      }
    }

    await User.deleteOne({ _id: id });

    await auditLog({
      req,
      actor: superAdmin,
      action: "user.delete",
      entity: "User",
      entityId: id,
      meta: { email: user.email, role: user.role },
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
