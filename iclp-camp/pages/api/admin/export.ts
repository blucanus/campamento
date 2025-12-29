import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { requireAdmin } from "@/lib/auth";
import ExcelJS from "exceljs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  const format = String(req.query.format || "csv");
  await connectDB();

  const regs = await Registration.find({}).lean();

  const rows: any[] = [];
  for (const reg of regs) {
    for (const a of reg.attendees || []) {
      rows.push({
        principal: reg.primary?.name || "",
        tel: reg.primary?.phone || "",
        email: reg.primary?.email || "",
        pago: reg.payment?.status || "",
        nombre: a.firstName || "",
        apellido: a.lastName || "",
        dni: a.dni || "",
        edad: a.age ?? "",
        relacion: a.relation || "",
        dieta: a.diet || "",
        sexo: a.sex || "",
        habitacion: a.lodging?.room || "",
        tipo: a.lodging?.type || "",
        cama: a.lodging?.bed || "",
        checkedInAt: a.checkedInAt ? new Date(a.checkedInAt).toISOString() : ""
      });
    }
  }

  if (format === "csv") {
    const headers = Object.keys(rows[0] || { principal: "" });
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=inscripciones.csv");
    return res.send(csv);
  }

  // xlsx
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inscripciones");
  ws.columns = Object.keys(rows[0] || { principal: "" }).map(k => ({ header: k, key: k, width: 18 }));
  ws.addRows(rows);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=inscripciones.xlsx");
  const buf = await wb.xlsx.writeBuffer();
  res.send(Buffer.from(buf));
}
