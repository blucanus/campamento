import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { Registration } from "@/models/Registration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  await connectDB();

  const { ids, purgePending } = (req.body || {}) as { ids?: unknown; purgePending?: unknown };

  // Nunca se borran inscripciones con pago aprobado.
  const notApproved = { "payment.status": { $ne: "approved" } };

  let filter: Record<string, unknown>;

  if (purgePending === true) {
    filter = notApproved;
  } else {
    const list = (Array.isArray(ids) ? ids : [])
      .map((x) => String(x || "").trim())
      .filter((x) => /^[a-fA-F0-9]{24}$/.test(x));

    if (!list.length) return res.status(400).json({ error: "No hay inscripciones seleccionadas." });
    filter = { _id: { $in: list }, ...notApproved };
  }

  const result = await Registration.deleteMany(filter);
  const deleted = Number(result?.deletedCount || 0);

  await auditLog({
    req,
    actor: { id: admin.id, email: admin.email, role: admin.role },
    action: purgePending === true ? "purge_pending_registrations" : "delete_registrations",
    entity: "Registration",
    meta: { deleted, ids: purgePending === true ? "all_pending" : ids }
  });

  return res.status(200).json({ ok: true, deleted });
}
