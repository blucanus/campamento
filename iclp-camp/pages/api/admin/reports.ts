import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";
import { DIET_RESTRICTIONS, dietRestrictionsLabel, normalizeDietRestrictions } from "@/lib/pure";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  const regs: any[] = await Registration.find({ "payment.status": { $ne: "refunded" } })
    .select("attendees")
    .lean();

  const bySex: Record<string, number> = {};
  const byDiet: Record<string, number> = {};
  const ages: number[] = [];

  // Cocina: cuantos platos exclusivos hay que preparar por restriccion.
  const byRestriction: Record<string, number> = {};
  for (const d of DIET_RESTRICTIONS) byRestriction[d.label] = 0;

  let menuBase = 0;
  let menuExclusivo = 0;

  for (const r of regs) {
    for (const a of r.attendees || []) {
      const sex = String(a.sex || "sin_dato");
      bySex[sex] = (bySex[sex] || 0) + 1;

      const restrictions = normalizeDietRestrictions(a.dietaryRestrictions);
      // Inscripciones viejas solo tienen el texto libre de `diet`.
      const diet = dietRestrictionsLabel(restrictions) || String(a.diet || "sin_dato");
      byDiet[diet] = (byDiet[diet] || 0) + 1;

      if (restrictions.length) {
        menuExclusivo += 1;
        for (const v of restrictions) {
          const label = DIET_RESTRICTIONS.find((d) => d.value === v)?.label || v;
          byRestriction[label] = (byRestriction[label] || 0) + 1;
        }
      } else {
        menuBase += 1;
      }

      if (typeof a.age === "number") ages.push(a.age);
    }
  }

  res.json({
    bySex,
    byDiet,
    byRestriction,
    menuBase,
    menuExclusivo,
    totalAttendees: ages.length
  });
}
