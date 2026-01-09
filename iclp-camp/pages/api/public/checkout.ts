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

  const { step1, attendees, regId } = req.body || {};
  if (!step1 || !Array.isArray(attendees) || attendees.length < 1) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const email = String(step1.email || "").trim();
  if (!email) return res.status(400).json({ error: "Email obligatorio" });

  await connectDB();

  const fullName = `${step1.primaryFirstName || ""} ${step1.primaryLastName || ""}`.trim();

  // 1) Reusar registro si viene regId
  let doc: any = null;
  if (regId) {
    doc = await Registration.findById(regId).catch(() => null);
  }

  // 2) Si no existe, crearlo
  if (!doc) {
    doc = await Registration.create({
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

    // Mail pendiente solo al crear por primera vez
    try {
      const m = mailPending({ fullName, attendeesCount: doc.attendees.length });
      await sendConfirmationEmail(email, m.subject, m.html);
    } catch {}
  } else {
    // Si existe, actualizamos por si cambió algo (sin crear duplicado)
    doc.primary = { name: fullName, phone: step1.phone, email };
    doc.attendance = { optionDays: step1.optionDays, daysDetail: step1.daysDetail || "" };

    // IMPORTANTE: si ya tenía qrToken por persona, lo ideal es conservarlo.
    // Para simplificar, regeneramos si faltara.
    doc.attendees = attendees.map((a: any) => ({
      firstName: a.firstName,
      lastName: a.lastName,
      dni: a.dni,
      age: Number(a.age || 0),
      relation: a.isPrimary ? "Principal" : a.relation,
      diet: a.diet || "ninguna",
      sex: a.sex || "M",
      isPrimary: !!a.isPrimary,
      qrToken: a.qrToken || nanoid(16),
      lodging: a.lodging || { type: "none", room: "", bed: "none" }
    }));
    await doc.save();
  }

  // Si ya está aprobado, no seguimos
  if (doc.payment?.status === "approved") {
    return res.json({ regId: String(doc._id), alreadyPaid: true });
  }

  if (!env.MP_ACCESS_TOKEN) {
    return res.json({ regId: String(doc._id), init_point: `${env.APP_URL}/mp/pending?reg=${doc._id}` });
  }

  // Calcular total real
  const { payingPeople, pricePerPerson, total } = computeTotalARS(step1, doc.attendees);

  // Si total 0 (todos menores), no cobramos
  if (total <= 0) {
    return res.json({ regId: String(doc._id), init_point: `${env.APP_URL}/mp/pending?reg=${doc._id}` });
  }

  // Crear preferencia
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

  return res.json({
    regId: String(doc._id),
    init_point: (pref as any).sandbox_init_point || pref.init_point
  });
}
