import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { MerchOrder } from "@/models/MerchOrder";
import { env } from "@/lib/env";
import { sendConfirmationEmail } from "@/lib/notify";
import { mailApproved } from "@/lib/templates";
import { ProductVariant } from "@/models/ProductVariant";

async function fetchPayment(paymentId: string) {
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` }
  });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // MP puede llamar con GET o POST. Aceptamos ambos.
  try {
    await connectDB();

    const topic = (req.query.topic || req.body?.type || req.body?.topic || "").toString();
    const id = (req.query.id || req.body?.data?.id || req.body?.id || "").toString();

    // En muchos casos viene topic=payment y id=<paymentId>
    if (!id) return res.status(200).json({ ok: true });

    if (!env.MP_ACCESS_TOKEN) return res.status(200).json({ ok: true });

    const payment = await fetchPayment(id);
    if (!payment) return res.status(200).json({ ok: true });

    const ref = String(payment.external_reference || "");
    if (!ref) return res.status(200).json({ ok: true });

    const newStatus = String(payment.status || "pending"); // approved / pending / rejected / in_process

    if (ref.startsWith("merch-")) {
      const orderId = ref.replace("merch-", "");
      const order: any = await MerchOrder.findById(orderId);
      if (!order) return res.status(200).json({ ok: true });

      const prevStatus = order.payment?.status;
      order.payment = order.payment || {};
      order.payment.status = newStatus;
      order.payment.paymentId = String(payment.id || "");
      order.payment.lastEventAt = new Date();
      await order.save();

      if (newStatus === "approved" && prevStatus !== "approved") {
        const items = Array.isArray(order.items) ? order.items : [];
        for (const x of items) {
          const variantId = x?.variantId;
          const qty = Number(x?.qty || 0);
          if (!variantId || qty <= 0) continue;

          try {
            await ProductVariant.updateOne(
              { _id: variantId, stock: { $gte: qty } },
              { $inc: { stock: -qty } }
            );
          } catch {
            // noop
          }
        }
      }

      return res.status(200).json({ ok: true, topic });
    }

    const regId = ref;
    const reg: any = await Registration.findById(regId);
    if (!reg) return res.status(200).json({ ok: true });

    const prevStatus = reg.payment?.status;

    // Actualizar estado de pago
    reg.payment = reg.payment || {};
    reg.payment.status = newStatus;
    reg.payment.paymentId = String(payment.id || "");
    reg.payment.lastEventAt = new Date();
    await reg.save();

    // ✅ Si pasa a approved y antes no lo era -> descontar stock + enviar mail confirmado
    if (newStatus === "approved" && prevStatus !== "approved") {
      // 1) Descontar stock (si hay extras)
      const extras = Array.isArray(reg.extras) ? reg.extras : [];

      for (const x of extras) {
        const variantId = x?.variantId;
        const qty = Number(x?.qty || 0);
        if (!variantId || qty <= 0) continue;

        // Descontar stock solo si alcanza (evita negativos)
        try {
          await ProductVariant.updateOne(
            { _id: variantId, stock: { $gte: qty } },
            { $inc: { stock: -qty } }
          );
        } catch {
          // si falla, no frenamos el webhook (MP requiere 200)
        }
      }

      // 2) Mail aprobado (tolerante: primary o step1)
      const fullName =
        reg.primary?.name ||
        `${reg.step1?.primaryFirstName || ""} ${reg.step1?.primaryLastName || ""}`.trim();

      const email =
        reg.primary?.email ||
        reg.step1?.email ||
        "";

      if (email) {
        const m = mailApproved({ fullName, attendeesCount: reg.attendees?.length || 0 });
        try {
          await sendConfirmationEmail(email, m.subject, m.html);
        } catch {
          // noop
        }
      }
    }

    return res.status(200).json({ ok: true, topic });
  } catch {
    // MP requiere 200 para no reintentar infinito
    return res.status(200).json({ ok: true });
  }
}
