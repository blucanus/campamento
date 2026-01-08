import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { env } from "@/lib/env";
import { sendConfirmationEmail } from "@/lib/notify";
import { mailApproved } from "@/lib/templates";

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

    const regId = String(payment.external_reference || "");
    if (!regId) return res.status(200).json({ ok: true });

    const reg = await Registration.findById(regId);
    if (!reg) return res.status(200).json({ ok: true });

    const newStatus = String(payment.status || "pending"); // approved / pending / rejected / in_process
    const prevStatus = reg.payment?.status;

    reg.payment.status = newStatus;
    reg.payment.paymentId = String(payment.id || "");
    reg.payment.lastEventAt = new Date();
    await reg.save();

    // Si pasa a approved y antes no lo era -> enviar mail confirmado
    if (newStatus === "approved" && prevStatus !== "approved") {
      const fullName = reg.primary?.name || "";
      const email = reg.primary?.email || "";
      if (email) {
        const m = mailApproved({ fullName, attendeesCount: reg.attendees?.length || 0 });
        try { await sendConfirmationEmail(email, m.subject, m.html); } catch {}
      }
    }

    return res.status(200).json({ ok: true });
  } catch {
    // MP requiere 200 para no reintentar infinito
    return res.status(200).json({ ok: true });
  }
}
