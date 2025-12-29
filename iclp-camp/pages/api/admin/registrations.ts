import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" }); // luego lo “finalizamos” con redirect en UI

  await connectDB();

  const regs = await Registration.find({})
    .sort({ createdAt: -1 })
    .select("primary attendees payment createdAt")
    .lean();

  res.json(regs);
}
