import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { AuditLog } from "@/models/AuditLog";
import { requireAdmin } from "@/lib/auth";
import { dietRestrictionsLabel, normalizePhoneAR } from "@/lib/pure";
import { getPaymentInfo } from "@/lib/mercadopago";
import ExcelJS from "exceljs";

type Row = Record<string, string | number>;

// Las inscripciones vienen de mongoose con step1 libre: se leen sueltas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RegLean = any;

function fmtDate(value: unknown) {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("es-AR");
}

/** 549XXXXXXXXXX, listo para wa.me. */
function whatsappOf(reg: RegLean) {
  const saved = String(reg.primary?.whatsapp || "").trim();
  if (saved) return saved;
  return normalizePhoneAR(reg.primary?.phone || reg.step1?.phone || "").wa;
}

/** Una fila por persona, sin las inscripciones devueltas. */
async function attendeeRows(): Promise<Row[]> {
  const regs = await Registration.find({ "payment.status": { $ne: "refunded" } }).lean();

  const rows: Row[] = [];
  for (const reg of regs as RegLean[]) {
    for (const a of reg.attendees || []) {
      rows.push({
        principal: reg.primary?.name || "",
        tel: reg.primary?.phone || "",
        whatsapp: whatsappOf(reg),
        email: reg.primary?.email || "",
        pago: reg.payment?.status || "",
        fechaInscripcion: fmtDate(reg.createdAt),
        fechaPago:
          String(reg.payment?.status || "").toLowerCase() === "approved"
            ? fmtDate(reg.payment?.lastEventAt)
            : "",
        codigo: reg.accessCodeUsed || "",
        nombre: a.firstName || "",
        apellido: a.lastName || "",
        dni: a.dni || "",
        edad: a.age ?? "",
        relacion: a.relation || "",
        dieta: dietRestrictionsLabel(a.dietaryRestrictions) || a.diet || "base",
        menuBase: dietRestrictionsLabel(a.dietaryRestrictions) ? "NO" : "SI",
        sexo: a.sex || "",
        habitacion: a.lodging?.room || "",
        tipo: a.lodging?.type || "",
        cama: a.lodging?.bed || "",
        checkedInAt: a.checkedInAt ? new Date(a.checkedInAt).toISOString() : ""
      });
    }
  }
  return rows;
}

/** Una fila por devolucion: cuanto se devolvio y a que medio de pago volvio. */
async function refundRows(): Promise<Row[]> {
  const regs = (await Registration.find({ "payment.status": "refunded" })
    .sort({ "payment.refundedAt": -1 })
    .lean()) as RegLean[];

  // Las devoluciones viejas no guardan el monto: lo tiene la auditoría.
  const ids = regs.map((r) => String(r._id));
  const logs = ids.length
    ? await AuditLog.find({ action: /^refund_registration/, entityId: { $in: ids } }).lean()
    : [];

  const loggedAmount = new Map<string, number>();
  for (const l of logs as RegLean[]) {
    const amount = Number(l.meta?.amount || 0);
    if (amount > 0) loggedAmount.set(String(l.entityId), amount);
  }

  // Las devoluciones viejas no guardan medio ni monto: se le preguntan a Mercado
  // Pago en paralelo y el medio queda guardado para la proxima.
  const fromMP = new Map<string, { method: string; refunded: number }>();
  await Promise.all(
    regs
      .filter((r) => String(r.payment?.paymentId || "").trim() && !r.payment?.method)
      .map(async (r) => {
        const pid = String(r.payment.paymentId).trim();
        try {
          const info = await getPaymentInfo(pid);
          fromMP.set(pid, info);
          if (info.method) {
            await Registration.updateOne({ _id: r._id }, { $set: { "payment.method": info.method } });
          }
        } catch {
          // si Mercado Pago no contesta, la fila sale con lo que haya
        }
      })
  );

  const rows: Row[] = [];
  for (const reg of regs) {
    const paymentId = String(reg.payment?.paymentId || "").trim();
    const mp = fromMP.get(paymentId);

    rows.push({
      principal: reg.primary?.name || "",
      tel: reg.primary?.phone || "",
      whatsapp: whatsappOf(reg),
      email: reg.primary?.email || "",
      personas: Array.isArray(reg.attendees) ? reg.attendees.length : 0,
      devuelto:
        Number(reg.payment?.refundedAmount || 0) ||
        loggedAmount.get(String(reg._id)) ||
        Number(mp?.refunded || 0),
      medio: String(reg.payment?.method || "") || mp?.method || "sin dato",
      alcance: reg.payment?.refundScope === "camp" ? "Solo el campa" : "Todo",
      productosPagos: Number(reg.payment?.paidAmount || 0),
      fechaDevolucion: fmtDate(reg.payment?.refundedAt),
      devueltoPor: reg.payment?.refundedBy || "",
      nroOperacionMP: paymentId,
      fechaInscripcion: fmtDate(reg.createdAt)
    });
  }
  return rows;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  const format = String(req.query.format || "csv");
  const refunds = String(req.query.kind || "") === "refunds";

  await connectDB();

  const rows = refunds ? await refundRows() : await attendeeRows();
  const name = refunds ? "devoluciones" : "inscripciones";
  const headers = Object.keys(rows[0] || { principal: "" });

  if (format === "csv") {
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${name}.csv`);
    return res.send(csv);
  }

  // xlsx
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(refunds ? "Devoluciones" : "Inscripciones");
  ws.columns = headers.map((k) => ({ header: k, key: k, width: 18 }));
  ws.addRows(rows);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${name}.xlsx`);
  const buf = await wb.xlsx.writeBuffer();
  res.send(Buffer.from(buf));
}
