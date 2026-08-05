import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { env } from "@/lib/env";
import { registrationTotalARS } from "@/lib/pricing";
import {
  createPointPaymentIntent,
  listPointDevices,
  setPointOperatingMode
} from "@/lib/mercadopago";
import { Registration } from "@/models/Registration";

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Error con Mercado Pago Point";
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
      if (reg) total = await registrationTotalARS(reg);
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
  const action = String(req.body?.action || "charge");

  // Pasar el posnet a modo PDV (sin eso no acepta cobros de la integracion)
  if (action === "pdv") {
    if (!deviceId) return res.status(400).json({ error: "Falta el posnet." });
    try {
      const device = await setPointOperatingMode(deviceId, "PDV");
      return res.status(200).json({ ok: true, device });
    } catch (e: unknown) {
      return res.status(502).json({ error: errorMessage(e) });
    }
  }

  if (!registrationId || !deviceId) {
    return res.status(400).json({ error: "Falta la inscripción o el posnet." });
  }

  await connectDB();

  const reg = await Registration.findById(registrationId).lean();
  if (!reg) return res.status(404).json({ error: "Inscripción no encontrada" });
  if (String(reg.payment?.status || "").toLowerCase() === "approved") {
    return res.status(400).json({ error: "Esta inscripción ya está paga." });
  }

  const total = await registrationTotalARS(reg);

  if (total <= 0) return res.status(400).json({ error: "El total a cobrar es 0." });

  try {
    const intent = await createPointPaymentIntent({
      deviceId,
      amountARS: total,
      externalReference: registrationId,
      // El posnet solo acepta alfanumerico en el ticket, sin guiones.
      ticketNumber: `ICLP${registrationId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
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
