import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { env } from "@/lib/env";
import { refundPayment } from "@/lib/mercadopago";
import { registrationTotalARS } from "@/lib/pricing";
import { refundAmountARS } from "@/lib/pure";
import { Registration } from "@/models/Registration";
import { ProductVariant } from "@/models/ProductVariant";

type Scope = "all" | "camp";
type Actor = { id: string; email: string; role: string };
type Result = { id: string; ok: boolean; error?: string; amount?: number; name?: string };

type ExtraLine = { unitPrice?: number; qty?: number; variantId?: unknown };

function extrasTotalARS(extras: unknown) {
  const list = Array.isArray(extras) ? (extras as ExtraLine[]) : [];
  return list.reduce((acc, x) => acc + Number(x?.unitPrice || 0) * Number(x?.qty || 0), 0);
}

/** Devuelve una inscripcion. `camp` devuelve solo la parte del campa: los productos quedan pagos. */
async function refundOne(req: NextApiRequest, admin: Actor, id: string, scope: Scope): Promise<Result> {
  const doc = await Registration.findById(id);
  if (!doc) return { id, ok: false, error: "Inscripción no encontrada" };

  const name = String(doc.primary?.name || "").trim();
  const status = String(doc.payment?.status || "").toLowerCase();
  if (status === "refunded") return { id, name, ok: false, error: "Ya está cancelada y devuelta." };
  if (status !== "approved") return { id, name, ok: false, error: "No está paga: no hay nada que devolver." };

  const paymentId = String(doc.payment?.paymentId || "").trim();
  if (!paymentId) return { id, name, ok: false, error: "No hay número de operación de Mercado Pago guardado." };

  // Las inscripciones viejas no guardan cuanto se cobro: valen lo de hoy.
  const paid = Number(doc.payment?.paidAmount || 0) || (await registrationTotalARS(doc));
  const extras = extrasTotalARS(doc.extras);
  const amount = refundAmountARS(paid, extras, scope);

  if (amount <= 0) {
    return { id, name, ok: false, error: "No hay monto para devolver." };
  }

  let refund;
  try {
    // Solo la parcial manda monto: la total la resuelve Mercado Pago sola.
    refund = await refundPayment(
      paymentId,
      `refund-${scope}-${amount}-${id}`,
      scope === "camp" ? amount : undefined
    );
  } catch (e: unknown) {
    return {
      id,
      name,
      ok: false,
      error: e instanceof Error ? e.message : "Mercado Pago rechazó la devolución"
    };
  }

  // El stock se descontó al aprobarse el pago. Si los productos no se devuelven, no vuelve.
  if (scope === "all") {
    for (const x of Array.isArray(doc.extras) ? doc.extras : []) {
      const qty = Number(x?.qty || 0);
      if (!x?.variantId || qty <= 0) continue;
      try {
        await ProductVariant.updateOne({ _id: x.variantId }, { $inc: { stock: qty } });
      } catch {
        // no frenamos la devolucion por el stock
      }
    }
  }

  const refunded = Number(refund?.amount ?? amount) || amount;

  doc.payment.status = "refunded";
  // ponytail: con scope "camp" la inscripcion queda cancelada pero los productos siguen
  // pagos y hay que entregarlos: se ven en la lista de admin, que no filtra devueltas.
  doc.payment.paidAmount = scope === "camp" ? extras : 0;
  doc.payment.refundedAmount = refunded;
  doc.payment.refundScope = scope;
  doc.payment.refundedAt = new Date();
  doc.payment.refundedBy = admin.email;
  // El link viejo sigue siendo pagable: lo tiramos.
  doc.payment.initPoint = "";
  doc.payment.preferenceId = "";
  await doc.save();

  await auditLog({
    req,
    actor: admin,
    action: scope === "camp" ? "refund_registration_camp" : "refund_registration",
    entity: "Registration",
    entityId: id,
    meta: { paymentId, refundId: refund?.id || "", amount: refunded, paid, extras, scope }
  });

  return { id, name, ok: true, amount: refunded };
}

/** Cancela inscripciones y devuelve la plata por Mercado Pago. Solo superadmin. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireSuperAdmin(req);
  if (!admin) return res.status(401).json({ error: "Solo el superadmin puede devolver pagos." });
  if (req.method !== "POST") return res.status(405).end();
  if (!env.MP_ACCESS_TOKEN) return res.status(400).json({ error: "Falta el token de Mercado Pago" });

  const scope: Scope = String(req.body?.scope || "all") === "camp" ? "camp" : "all";
  const raw = Array.isArray(req.body?.registrationIds)
    ? req.body.registrationIds
    : [req.body?.registrationId];

  const ids = raw
    .map((x: unknown) => String(x || "").trim())
    .filter((x: string) => /^[a-fA-F0-9]{24}$/.test(x));

  if (!ids.length) return res.status(400).json({ error: "Falta la inscripción" });

  await connectDB();

  const actor = { id: admin.id, email: admin.email, role: admin.role };
  const results: Result[] = [];
  // De a una: Mercado Pago no acepta devoluciones en lote.
  for (const id of ids) results.push(await refundOne(req, actor, id, scope));

  const okCount = results.filter((r) => r.ok).length;

  // Una sola inscripcion: el error va directo, como antes.
  if (ids.length === 1 && !okCount) {
    return res.status(502).json({ error: results[0].error || "No se pudo devolver el pago" });
  }

  return res.status(200).json({
    ok: true,
    scope,
    refunded: okCount,
    failed: results.length - okCount,
    amount: results.reduce((acc, r) => acc + (r.ok ? Number(r.amount || 0) : 0), 0),
    results
  });
}
