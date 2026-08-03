import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { computeTotalARS } from "@/lib/pricing";
import { getCampEdition } from "@/lib/campEdition";
import { createPreference } from "@/lib/mercadopago";
import { Registration } from "@/models/Registration";

type ExtraLike = { name?: string; qty?: number; unitPrice?: number; attributes?: Record<string, string> };

/**
 * Levanta una inscripcion que quedo trunca: si nunca llego a generar el link de
 * pago de Mercado Pago, lo crea ahora con lo que ya tiene guardado.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staff = requireStaff(req);
  if (!staff) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const id = String(req.body?.registrationId || "").trim();
  if (!id) return res.status(400).json({ error: "Falta la inscripción" });

  await connectDB();

  const doc = await Registration.findById(id);
  if (!doc) return res.status(404).json({ error: "Inscripción no encontrada" });

  if (String(doc.payment?.status || "").toLowerCase() === "approved") {
    return res.status(400).json({ error: "Esta inscripción ya está paga." });
  }

  if (doc.payment?.initPoint) {
    return res.status(200).json({ ok: true, initPoint: doc.payment.initPoint, created: false });
  }

  if (!env.MP_ACCESS_TOKEN) return res.status(400).json({ error: "Falta el token de Mercado Pago" });

  const camp = await getCampEdition();
  const attendees = Array.isArray(doc.attendees) ? doc.attendees : [];
  const base = computeTotalARS(doc.step1, attendees, camp.priceFull);
  const campTotal = Number(base.campTotal || 0);

  const extras: ExtraLike[] = Array.isArray(doc.extras) ? doc.extras : [];
  const items = [
    {
      title: "Inscripción Campamento ICLP",
      quantity: 1,
      unit_price: campTotal,
      currency_id: "ARS" as const
    },
    ...extras.map((x) => ({
      title: String(x?.name || "Producto"),
      quantity: Number(x?.qty || 0),
      unit_price: Number(x?.unitPrice || 0),
      currency_id: "ARS" as const
    }))
  ].filter((x) => x.quantity > 0 && x.unit_price > 0);

  if (!items.length) return res.status(400).json({ error: "El total a cobrar es 0." });

  const email = String(doc.primary?.email || doc.step1?.email || "").trim();

  const pref = await createPreference({
    items,
    external_reference: String(doc._id),
    payer_email: email,
    notification_url: env.MP_NOTIFICATION_URL,
    back_urls: {
      success: `${env.APP_URL}/mp/success`,
      pending: `${env.APP_URL}/mp/pending`,
      failure: `${env.APP_URL}/mp/failure`
    }
  });

  const initPoint = env.MP_ACCESS_TOKEN.startsWith("TEST-")
    ? pref.sandbox_init_point || pref.init_point
    : pref.init_point;

  doc.payment = doc.payment || {};
  doc.payment.preferenceId = pref.id;
  doc.payment.initPoint = initPoint;
  doc.payment.status = doc.payment.status || "pending";
  await doc.save();

  return res.status(200).json({ ok: true, initPoint, created: true });
}
