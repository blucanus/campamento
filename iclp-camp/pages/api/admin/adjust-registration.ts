import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { registrationTotalARS } from "@/lib/pricing";
import { Registration } from "@/models/Registration";

const ONE_DAY = ["viernes", "sabado", "domingo"];
const TWO_DAYS = ["viernes-sabado", "sabado-domingo"];

/**
 * Cambia los dias de una inscripcion ya hecha (se anoto 1 dia y ahora va a los 3).
 * Deja registrado lo que ya pago, para que el cobro siguiente sea la diferencia.
 * Solo superadmin.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireSuperAdmin(req);
  if (!admin) return res.status(401).json({ error: "Solo el superadmin puede modificar la compra." });
  if (req.method !== "POST") return res.status(405).end();

  const id = String(req.body?.registrationId || "").trim();
  const optionDays = String(req.body?.optionDays || "").trim();
  const daysDetail = String(req.body?.daysDetail || "").trim();

  if (!id) return res.status(400).json({ error: "Falta la inscripción" });
  if (!["1", "2", "full"].includes(optionDays)) {
    return res.status(400).json({ error: "Opción de días inválida" });
  }
  if (optionDays === "1" && !ONE_DAY.includes(daysDetail)) {
    return res.status(400).json({ error: "Elegí qué día viene." });
  }
  if (optionDays === "2" && !TWO_DAYS.includes(daysDetail)) {
    return res.status(400).json({ error: "Elegí qué dos días viene." });
  }

  await connectDB();

  const doc = await Registration.findById(id);
  if (!doc) return res.status(404).json({ error: "Inscripción no encontrada" });

  const status = String(doc.payment?.status || "").toLowerCase();
  if (status === "refunded") {
    return res.status(400).json({ error: "Esta inscripción está cancelada." });
  }

  const totalBefore = await registrationTotalARS(doc);

  doc.payment = doc.payment || {};
  // Las inscripciones viejas no guardan cuanto se cobro: si esta aprobada, pago
  // lo que vale hoy. Se fija antes de tocar los dias.
  if (status === "approved" && !Number(doc.payment.paidAmount || 0)) {
    doc.payment.paidAmount = totalBefore;
  }

  const before = { optionDays: doc.step1?.optionDays, daysDetail: doc.step1?.daysDetail };

  doc.step1 = {
    ...(doc.step1 || {}),
    optionDays,
    daysDetail: optionDays === "full" ? "" : daysDetail,
    ...(optionDays === "1" ? { oneDay: daysDetail } : {}),
    ...(optionDays === "2" ? { twoDays: daysDetail } : {})
  };
  doc.markModified("step1"); // step1 es Object libre: mongoose no lo detecta solo

  const totalAfter = await registrationTotalARS(doc);
  const paid = Number(doc.payment.paidAmount || 0);
  const due = Math.max(0, totalAfter - paid);

  if (due > 0) {
    // Vuelve a quedar cobrable: el link viejo tenia el monto viejo.
    doc.payment.status = "pending";
    doc.payment.initPoint = "";
    doc.payment.preferenceId = "";
  }

  await doc.save();

  await auditLog({
    req,
    actor: { id: admin.id, email: admin.email, role: admin.role },
    action: "adjust_registration_days",
    entity: "Registration",
    entityId: id,
    meta: { before, after: { optionDays, daysDetail }, totalBefore, totalAfter, paid, due }
  });

  return res.status(200).json({
    ok: true,
    totalBefore,
    totalAfter,
    paid,
    due,
    // Si bajaron los dias despues de pagar, queda a favor: se devuelve a mano.
    credit: Math.max(0, paid - totalAfter)
  });
}
