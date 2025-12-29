import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";

function ageRange(age: number) {
  if (age <= 3) return "0-3";
  if (age <= 6) return "4-6";
  if (age <= 9) return "7-9";
  if (age <= 12) return "10-12";
  if (age <= 17) return "13-17";
  if (age <= 25) return "18-25";
  if (age <= 40) return "26-40";
  return "41+";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();
  const regs = await Registration.find({}).select("attendees").lean();

  const byDiet: Record<string, number> = {};
  const bySex: Record<string, number> = {};
  const byAgeRange: Record<string, number> = {};

  for (const reg of regs) {
    for (const a of reg.attendees || []) {
      byDiet[a.diet || "ninguna"] = (byDiet[a.diet || "ninguna"] || 0) + 1;
      bySex[a.sex || "X"] = (bySex[a.sex || "X"] || 0) + 1;
      const ar = ageRange(Number(a.age || 0));
      byAgeRange[ar] = (byAgeRange[ar] || 0) + 1;
    }
  }

  res.json({ byDiet, bySex, byAgeRange });
}
