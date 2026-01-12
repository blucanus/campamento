import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  const regs = await Registration.find({})
    .sort({ createdAt: -1 })
    // ✅ Traemos ambos formatos + extras
    .select("primary step1 attendees extras payment createdAt")
    .lean();

  // ✅ Normalizamos para que el frontend siempre tenga primary "usable"
  const normalized = regs.map((r: any) => {
    const primaryName =
      r.primary?.name ||
      `${r.step1?.primaryFirstName || ""} ${r.step1?.primaryLastName || ""}`.trim() ||
      "-";

    const primaryPhone = r.primary?.phone || r.step1?.phone || "-";
    const primaryEmail = r.primary?.email || r.step1?.email || "-";

    return {
      ...r,
      primary: {
        name: primaryName,
        phone: primaryPhone,
        email: primaryEmail
      },
      // banderita útil para UI (opcional)
      hasExtras: Array.isArray(r.extras) && r.extras.length > 0
    };
  });

  res.json(normalized);
}
