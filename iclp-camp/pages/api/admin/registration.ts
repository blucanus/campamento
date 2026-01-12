import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "Missing id" });

  await connectDB();

  const reg: any = await Registration.findById(id)
    // ✅ Traer ambos formatos + extras
    .select("primary step1 attendees extras payment createdAt")
    .lean();

  if (!reg) return res.status(404).json({ error: "Not found" });

  // ✅ Normalizar primary para que SIEMPRE haya nombre/tel/email “usables”
  const primaryName =
    reg.primary?.name ||
    `${reg.step1?.primaryFirstName || ""} ${reg.step1?.primaryLastName || ""}`.trim() ||
    "-";

  // ojo: por si en tu step1 el campo se llama "tel" en vez de "phone"
  const primaryPhone = reg.primary?.phone || reg.step1?.phone || reg.step1?.tel || "-";
  const primaryEmail = reg.primary?.email || reg.step1?.email || "-";

  return res.status(200).json({
    ...reg,
    primary: {
      name: primaryName,
      phone: primaryPhone,
      email: primaryEmail
    }
  });
}
