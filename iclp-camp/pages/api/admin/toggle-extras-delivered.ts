import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Registration } from "@/models/Registration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin: any = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const { registrationId, delivered } = req.body || {};
  if (!registrationId) return res.status(400).json({ error: "Missing registrationId" });

  await connectDB();

  const reg: any = await Registration.findById(registrationId);
  if (!reg) return res.status(404).json({ error: "Not found" });

  const next = Boolean(delivered);

  reg.extrasDelivered = next;
  reg.extrasDeliveredAt = next ? new Date() : null;
  reg.extrasDeliveredBy = next ? (admin?.email || admin?.user || admin?.id || "admin") : "";

  await reg.save();

  return res.status(200).json({
    ok: true,
    extrasDelivered: reg.extrasDelivered,
    extrasDeliveredAt: reg.extrasDeliveredAt,
    extrasDeliveredBy: reg.extrasDeliveredBy
  });
}
