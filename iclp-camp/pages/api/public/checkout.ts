import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { nanoid } from "nanoid";
import { sendConfirmationEmail } from "@/lib/notify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { step1, attendees } = req.body || {};
  if (!step1 || !Array.isArray(attendees) || attendees.length < 1) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  await connectDB();

  const doc = await Registration.create({
    primary: { name: step1.primaryName, phone: step1.phone, email: step1.email || "" },
    attendance: { optionDays: step1.optionDays, daysDetail: step1.daysDetail || "" },
    attendees: attendees.map((a: any) => ({
      firstName: a.firstName,
      lastName: a.lastName,
      dni: a.dni,
      age: Number(a.age || 0),
      relation: a.relation,
      diet: a.diet || "ninguna",
      sex: a.sex || "X",
      isPrimary: !!a.isPrimary,
      qrToken: nanoid(16),
      lodging: { type: "none", room: "", bed: "none" }
    })),
    payment: { status: "approved" } // DEMO: aprobado directo (luego MP real)
  });

  // email confirmación si hay email
  const to = (step1.email || "").trim();
  if (to) {
    const html = `
      <div style="font-family:Arial,sans-serif">
        <h2>Inscripción confirmada</h2>
        <p>Hola <b>${step1.primaryName}</b>, tu inscripción fue registrada.</p>
        <p><b>Integrantes:</b> ${doc.attendees.length}</p>
        <p>Te esperamos 🙌</p>
      </div>
    `;
    try { await sendConfirmationEmail(to, "Confirmación de inscripción - Campamento ICLP", html); } catch {}
  }

  // init_point demo
  res.json({ init_point: `/success?reg=${doc._id}` });
}
