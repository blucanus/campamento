import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { env } from "@/lib/env";
import { computeTotalARS } from "@/lib/pricing";
import { getCampEdition } from "@/lib/campEdition";
import { createPointPaymentIntent, listPointDevices } from "@/lib/mercadopago";
import { Registration } from "@/models/Registration";

type ExtraLike = { qty?: number; unitPrice?: number };

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Error con Mercado Pago Point";
}

// Mismo calculo que el checkout: campa (con el precio de la edicion) + productos.
async function totalOf(reg: { step1?: unknown; attendees?: unknown[]; extras?: ExtraLike[] }) {
  const camp = await getCampEdition();
  const base = computeTotalARS(reg.step1, reg.attendees || [], camp.priceFull);
  const extrasTotal = (reg.extras || []).reduce(
    (acc: number, x: ExtraLike) => acc + Number(x?.unitPrice || 0) * Number(x?.qty || 0),
    0
  );
  return Number(base.campTotal || 0) + extrasTotal;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staff = requireStaff(req);
  if (!staff) return res.status(401).json({ error: "Unauthorized" });
  if (!env.MP_ACCESS_TOKEN) return res.status(400).json({ error: "Falta el token de Mercado Pago" });

  // Posnets disponibles (+ total a cobrar si mandan una inscripcion)
  if (req.method === "GET") {
    const regId = String(req.query.registrationId || "").trim();
    let total = 0;

    if (regId) {
      await connectDB();
      const reg = await Registration.findById(regId).lean();
      if (reg) total = await totalOf(reg);
    }

    try {
      return res.status(200).json({ devices: await listPointDevices(), total });
    } catch (e: unknown) {
      // Sin posnet configurado igual queremos mostrar el total y el QR.
      return res.status(200).json({ devices: [], total, error: errorMessage(e) });
    }
  }

  if (req.method !== "POST") return res.status(405).end();

  const registrationId = String(req.body?.registrationId || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();
  if (!registrationId || !deviceId) {
    return res.status(400).json({ error: "Falta la inscripción o el posnet." });
  }

  await connectDB();

  const reg = await Registration.findById(registrationId).lean();
  if (!reg) return res.status(404).json({ error: "Inscripción no encontrada" });
  if (String(reg.payment?.status || "").toLowerCase() === "approved") {
    return res.status(400).json({ error: "Esta inscripción ya está paga." });
  }

  const camp = await getCampEdition();
  const total = await totalOf(reg);

  if (total <= 0) return res.status(400).json({ error: "El total a cobrar es 0." });

  try {
    const intent = await createPointPaymentIntent({
      deviceId,
      amountARS: total,
      externalReference: registrationId,
      description: `Campamento ICLP ${camp.edition}`
    });

    await auditLog({
      req,
      actor: { id: staff.id, email: staff.email, role: staff.role },
      action: "point_charge",
      entity: "Registration",
      entityId: registrationId,
      meta: { deviceId, total, intentId: intent?.id || "" }
    });

    return res.status(200).json({ ok: true, total, intentId: intent?.id || "" });
  } catch (e: unknown) {
    return res.status(502).json({ error: errorMessage(e) });
  }
}
