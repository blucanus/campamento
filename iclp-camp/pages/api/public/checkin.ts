import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ error: "Missing token" });

  await connectDB();

  const reg = await Registration.findOne({ "attendees.qrToken": token });
  if (!reg) return res.status(404).json({ error: "Not found" });

  const attendee = reg.attendees.find((a: any) => a.qrToken === token);
  if (!attendee) return res.status(404).json({ error: "Not found" });

  // marcar check-in (idempotente)
  if (!attendee.checkedInAt) attendee.checkedInAt = new Date();
  await reg.save();

  res.json({
    ok: true,
    attendee: {
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      dni: attendee.dni,
      checkedInAt: attendee.checkedInAt
    }
  });
}
