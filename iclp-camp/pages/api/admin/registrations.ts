import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  const q = String(req.query.q || "").trim().toLowerCase();

  // Traemos lo necesario y filtramos en memoria (simple y suficiente para tu volumen actual).
  const regs = await Registration.find({})
    .sort({ createdAt: -1 })
    .select("primary step1 attendees extras payment createdAt extrasDelivered")
    .lean();

  const normalized = regs.map((r: any) => {
    const primaryName =
      r.primary?.name ||
      `${r.step1?.primaryFirstName || ""} ${r.step1?.primaryLastName || ""}`.trim() ||
      "-";

    const primaryPhone = r.primary?.phone || r.step1?.phone || r.step1?.tel || "-";
    const primaryEmail = r.primary?.email || r.step1?.email || "-";

    return {
      ...r,
      primary: { name: primaryName, phone: primaryPhone, email: primaryEmail },
      hasExtras: Array.isArray(r.extras) && r.extras.length > 0
    };
  });

  const filtered =
    !q
      ? normalized
      : normalized.filter((r: any) => {
          const hay =
            `${r.primary?.name || ""} ${r.primary?.email || ""} ${r.primary?.phone || ""}`.toLowerCase();

          if (hay.includes(q)) return true;

          const attendees = Array.isArray(r.attendees) ? r.attendees : [];
          return attendees.some((a: any) => {
            const s = `${a.firstName || ""} ${a.lastName || ""} ${a.dni || ""}`.toLowerCase();
            return s.includes(q);
          });
        });

  res.json(filtered);
}
