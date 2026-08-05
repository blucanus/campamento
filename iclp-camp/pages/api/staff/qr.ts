import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { registrationTotalARS } from "@/lib/pricing";
import { getCampEdition } from "@/lib/campEdition";
import {
  createQrOrder,
  getCollectorId,
  getOrCreateQrPos,
  getOrCreateQrStore
} from "@/lib/mercadopago";
import { sanitizePosId } from "@/lib/pure";
import { Registration } from "@/models/Registration";

/**
 * QR interoperable (Transferencias 3.0): lo pueden escanear Mercado Pago y otras
 * billeteras (Cuenta DNI, MODO, etc.). Distinto del QR del link de checkout.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staff = requireStaff(req);
  if (!staff) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();
  if (!env.MP_ACCESS_TOKEN) return res.status(400).json({ error: "Falta el token de Mercado Pago" });

  const id = String(req.body?.registrationId || "").trim();
  if (!id) return res.status(400).json({ error: "Falta la inscripción" });

  await connectDB();

  const reg = await Registration.findById(id).lean();
  if (!reg) return res.status(404).json({ error: "Inscripción no encontrada" });
  if (String(reg.payment?.status || "").toLowerCase() === "approved") {
    return res.status(400).json({ error: "Esta inscripción ya está paga." });
  }

  const total = await registrationTotalARS(reg);
  if (total <= 0) return res.status(400).json({ error: "El total a cobrar es 0." });

  try {
    const camp = await getCampEdition();
    const collectorId = await getCollectorId();
    const posId = sanitizePosId(env.MP_QR_POS_ID);
    const store = await getOrCreateQrStore(collectorId, posId);
    const pos = await getOrCreateQrPos(posId, String(store?.id || ""));
    const externalPosId = String(pos?.external_id || posId);

    const order = await createQrOrder({
      collectorId,
      externalPosId,
      externalReference: id,
      title: `Campamento ICLP ${camp.edition}`,
      totalAmount: total,
      notificationUrl: env.MP_NOTIFICATION_URL
    });

    if (!order?.qr_data) throw new Error("Mercado Pago no devolvió el QR.");

    return res.status(200).json({ ok: true, qrData: order.qr_data, total });
  } catch (e: unknown) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "No se pudo generar el QR interoperable"
    });
  }
}
