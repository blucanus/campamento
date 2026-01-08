import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { nanoid } from "nanoid";
import { sendConfirmationEmail } from "@/lib/notify";
import { mailPending } from "@/lib/templates";
import { env } from "@/lib/env";
import { createPreference } from "@/lib/mercadopago";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { step1, attendees } = req.body || {};
  if (!step1 || !Array.isArray(attendees) || attendees.length < 1) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const email = String(step1.email || "").trim();
  if (!email) return res.status(400).json({ error: "Email obligatorio" });

  await connectDB();

  // Crear registro en estado pending (hasta que webhook confirme)
  const fullName = `${step1.primaryFirstName} ${step1.primaryLastName}`.trim();

  const doc = await Registration.create({
    primary: { name: fullName, phone: step1.phone, email },
    attendance: { optionDays: step1.optionDays, daysDetail: step1.daysDetail || "" },
    attendees: attendees.map((a: any) => ({
      firstName: a.firstName,
      lastName: a.lastName,
      dni: a.dni,
      age: Number(a.age || 0),
      relation: a.isPrimary ? "Principal" : a.relation,
      diet: a.diet || "ninguna",
      sex: a.sex || "M",
      isPrimary: !!a.isPrimary,
      qrToken: nanoid(16),
      lodging: { type: "none", room: "", bed: "none" }
    })),
    payment: { status: "pending", preferenceId: "", paymentId: "", lastEventAt: null }
  });

  // Email: datos cargados (pago pendiente)
  try {
    const m = mailPending({ fullName, attendeesCount: doc.attendees.length });
    await sendConfirmationEmail(email, m.subject, m.html);
  } catch {}

  // Si no hay MP token -> demo
  if (!env.MP_ACCESS_TOKEN) {
    return res.json({ init_point: `/success?reg=${doc._id}` });
  }

  // Monto: por ahora simple por persona (si querés, lo conecto con pricing real después)
  // RECOMENDADO: conectar con pricing.ts; hoy dejamos monto fijo por persona (más simple).
  // Si ya tenés pricing, decime y lo engancho al cálculo exacto.
  const unit_price = 1; // <-- reemplazar por cálculo real
  const quantity = 1;   // <-- reemplazar por cálculo real

  const pref = await createPreference({
    title: `Campamento ICLP (${doc.attendees.length} persona/s)`,
    quantity,
    unit_price,
    external_reference: String(doc._id),
    payer_email: email,
    notification_url: env.MP_NOTIFICATION_URL,
    back_urls: {
      success: `${env.APP_URL}/mp/success?reg=${doc._id}`,
      pending: `${env.APP_URL}/mp/pending?reg=${doc._id}`,
      failure: `${env.APP_URL}/mp/failure?reg=${doc._id}`
    }
  });

  doc.payment.preferenceId = pref.id;
  await doc.save();

  res.json({ init_point: pref.sandbox_init_point || pref.init_point });

}
