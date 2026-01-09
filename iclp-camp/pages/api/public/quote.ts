import type { NextApiRequest, NextApiResponse } from "next";
import { computeTotalARS } from "@/lib/pricing";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { step1, attendees } = req.body || {};
  if (!step1 || !Array.isArray(attendees)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const q = computeTotalARS(step1, attendees);

  return res.status(200).json(q);
}
