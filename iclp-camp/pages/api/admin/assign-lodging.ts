import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  if (req.method !== "POST") return res.status(405).end();
  const { registrationId, attendeeId, lodging } = req.body || {};
  if (!registrationId || !attendeeId || !lodging) return res.status(400).json({ error: "Bad payload" });

  await connectDB();

  const reg = await Registration.findById(registrationId);
  if (!reg) return res.status(404).json({ error: "Not found" });

  const a = reg.attendees.id(attendeeId);
  if (!a) return res.status(404).json({ error: "Attendee not found" });

  a.lodging = {
    type: lodging.type || "none",
    room: lodging.room || "",
    bed: lodging.type === "bunk" ? (lodging.bed || "none") : "none"
  };

  await reg.save();
  res.json({ ok: true });
}
