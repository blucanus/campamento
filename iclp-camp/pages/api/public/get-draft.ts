import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { regId } = req.body || {};
  if (!regId || typeof regId !== "string") return res.status(400).json({ error: "Missing regId" });
  if (!/^[a-fA-F0-9]{24}$/.test(regId)) return res.status(400).json({ error: "Invalid regId" });

  await connectDB();

  const doc = await Registration.findById(regId).select("attendees").lean();
  if (!doc) return res.status(404).json({ error: "Registro no encontrado" });

  return res.status(200).json({ attendees: doc.attendees || [] });
}
