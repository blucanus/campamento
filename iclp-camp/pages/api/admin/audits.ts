import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { AuditLog } from "@/models/AuditLog";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const superAdmin = requireSuperAdmin(req);
  if (!superAdmin) return res.status(403).json({ error: "Forbidden" });

  await connectDB();

  const limit = Math.min(200, Math.max(10, Number(req.query.limit || 50)));
  const logs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json(
    (logs as any[]).map(l => ({
      id: String(l._id),
      createdAt: l.createdAt,
      actor: l.actor,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      meta: l.meta,
      ip: l.ip,
      ua: l.ua,
    }))
  );
}
