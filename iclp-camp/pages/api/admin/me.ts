import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  res.json({ ok: true, admin });
}
