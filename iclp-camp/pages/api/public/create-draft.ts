import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";

function normalizePrimary(step1: any) {
  const first = String(step1?.primaryFirstName || step1?.firstName || "").trim();
  const last = String(step1?.primaryLastName || step1?.lastName || "").trim();

  const email = String(step1?.email || step1?.mail || "").trim();

  const phone =
    String(
      step1?.phone ||
      step1?.tel ||
      step1?.telefono ||
      step1?.phoneNumber ||
      ""
    ).trim();

  return {
    name: `${first} ${last}`.trim() || "-",
    email: email || "",
    phone: phone || ""
  };
}

function sanitizeAttendees(attendees: any[]) {
  return (attendees || []).map((a: any) => {
    const out = { ...a };
    const id = String(out?._id || "").trim();
    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      delete (out as any)._id;
    }
    return out;
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { step1, attendees } = req.body || {};
  if (!step1 || !Array.isArray(attendees)) return res.status(400).json({ error: "Invalid payload" });

  const primary = normalizePrimary(step1);

  await connectDB();

  const safeAttendees = sanitizeAttendees(attendees);

  const doc = await Registration.create({
    step1,
    primary,
    attendees: safeAttendees,
    extras: [],
    payment: { status: "pending" }
  });

  return res.status(200).json({
    regId: String(doc._id),
    attendees: doc.attendees
  });
}
