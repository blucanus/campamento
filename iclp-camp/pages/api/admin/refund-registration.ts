import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { env } from "@/lib/env";
import { refundPayment } from "@/lib/mercadopago";
import { Registration } from "@/models/Registration";
import { ProductVariant } from "@/models/ProductVariant";

/** Cancela la inscripcion y devuelve la plata por Mercado Pago. Solo superadmin. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireSuperAdmin(req);
  if (!admin) return res.status(401).json({ error: "Solo el superadmin puede devolver pagos." });
  if (req.method !== "POST") return res.status(405).end();
  if (!env.MP_ACCESS_TOKEN) return res.status(400).json({ error: "Falta el token de Mercado Pago" });

  const id = String(req.body?.registrationId || "").trim();
  if (!id) return res.status(400).json({ error: "Falta la inscripción" });

  await connectDB();

  const doc = await Registration.findById(id);
  if (!doc) return res.status(404).json({ error: "Inscripción no encontrada" });

  const status = String(doc.payment?.status || "").toLowerCase();
  if (status === "refunded") return res.status(400).json({ error: "Ya está cancelada y devuelta." });
  if (status !== "approved") {
    return res.status(400).json({ error: "Esta inscripción no está paga: no hay nada que devolver." });
  }

  const paymentId = String(doc.payment?.paymentId || "").trim();
  if (!paymentId) {
    return res.status(400).json({ error: "No hay número de operación de Mercado Pago guardado." });
  }

  let refund;
  try {
    refund = await refundPayment(paymentId, `refund-reg-${id}`);
  } catch (e: unknown) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Mercado Pago rechazó la devolución"
    });
  }

  // El stock se descontó al aprobarse el pago: vuelve.
  for (const x of Array.isArray(doc.extras) ? doc.extras : []) {
    const qty = Number(x?.qty || 0);
    if (!x?.variantId || qty <= 0) continue;
    try {
      await ProductVariant.updateOne({ _id: x.variantId }, { $inc: { stock: qty } });
    } catch {
      // no frenamos la devolucion por el stock
    }
  }

  doc.payment.status = "refunded";
  doc.payment.paidAmount = 0;
  doc.payment.refundedAt = new Date();
  doc.payment.refundedBy = admin.email;
  // El link viejo sigue siendo pagable: lo tiramos.
  doc.payment.initPoint = "";
  doc.payment.preferenceId = "";
  await doc.save();

  await auditLog({
    req,
    actor: { id: admin.id, email: admin.email, role: admin.role },
    action: "refund_registration",
    entity: "Registration",
    entityId: id,
    meta: { paymentId, refundId: refund?.id || "", amount: refund?.amount ?? null }
  });

  return res.status(200).json({ ok: true, refundId: refund?.id || "", amount: refund?.amount ?? null });
}
