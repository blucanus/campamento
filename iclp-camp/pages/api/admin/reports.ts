import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  const regs: any[] = await Registration.find({})
    .select("attendees")
    .lean();

  const bySex: Record<string, number> = {};
  const byDiet: Record<string, number> = {};
  const ages: number[] = [];

  for (const r of regs) {
    for (const a of r.attendees || []) {
      const sex = String(a.sex || "sin_dato");
      const diet = String(a.diet || "sin_dato");
      bySex[sex] = (bySex[sex] || 0) + 1;
      byDiet[diet] = (byDiet[diet] || 0) + 1;
      if (typeof a.age === "number") ages.push(a.age);
    }
  }

  res.json({ bySex, byDiet, totalAttendees: ages.length });
}
