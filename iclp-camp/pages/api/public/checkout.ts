import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { nanoid } from "nanoid";
import { sendConfirmationEmail } from "@/lib/notify";
import { mailPending } from "@/lib/templates";
import { env } from "@/lib/env";
import { createPreference } from "@/lib/mercadopago";
import { computeTotalARS } from "@/lib/pricing";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { step1, attendees } = req.body || {};
  if (!step1 || !Array.isArray(attendees) || attendees.length < 1) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // Email obligatorio
  const email = String(step1.email || "").trim();
  if (!email) return res.status(400).json({ error: "Email obligatorio" });

  await connectDB();

  const fullName = `${step1.primaryFirstName || ""} ${step1.primaryLastName || ""}`.trim();

  // Crear registro en estado pending
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
    payment: {
      status: "pending",
      preferenceId: "",
      paymentId: "",
      lastEventAt: null
    }
  });

  // Email: datos cargados (pago pendiente)
  try {
    const m = mailPending({ fullName, attendeesCount: doc.attendees.length });
    await sendConfirmationEmail(email, m.subject, m.html);
  } catch {
    // no frenamos checkout si falla email
  }

  // Si no hay token de MP, fallback (no debería pasar en prod)
  if (!env.MP_ACCESS_TOKEN) {
    return res.json({ init_point: `${env.APP_URL}/mp/pending?reg=${doc._id}` });
  }

  // Calcular total real
  const { payingPeople, pricePerPerson, total } = computeTotalARS(step1, doc.attendees);

  // Caso: todos menores de 4 => sin cobro (queda pendiente/manual)
  if (total <= 0) {
    return res.json({ init_point: `${env.APP_URL}/mp/pending?reg=${doc._id}` });
  }

  // Crear preferencia de Mercado Pago
  const pref = await createPreference({
    title: `Campamento ICLP (${doc.attendees.length} inscriptos)`,
    quantity: payingPeople,
    unit_price: pricePerPerson,
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

  // En test, si existe sandbox_init_point lo usamos
  res.json({ init_point: (pref as any).sandbox_init_point || pref.init_point });
}
