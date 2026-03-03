import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { NextApiRequest, NextApiResponse } from "next";

type AttendeeLike = {
  firstName?: string;
  lastName?: string;
  dni?: string;
  relation?: string;
  isPrimary?: boolean;
  lodging?: {
    room?: string;
    bed?: string;
    type?: string;
  };
};
type RegistrationLite = {
  attendees?: AttendeeLike[];
  primary?: {
    name?: string;
  };
  step1?: {
    primaryFirstName?: string;
    primaryLastName?: string;
  };
};

function normalizeDni(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function pickRoom(a: AttendeeLike | undefined) {
  return String(a?.lodging?.room || "").trim() || "-";
}

function pickBed(a: AttendeeLike | undefined) {
  return String(a?.lodging?.bed || "").trim() || "-";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  await connectDB();
  const dniRaw = String(req.query.dni || "").trim();
  const dniNorm = normalizeDni(dniRaw);
  if (!dniNorm) return res.status(400).json({ error: "DNI requerido" });

  const regs = await Registration.find({})
    .select("attendees primary step1")
    .lean();

  let foundReg: RegistrationLite | null = null;
  let foundAttendee: AttendeeLike | undefined;

  for (const reg of regs as RegistrationLite[]) {
    const attendees: AttendeeLike[] = Array.isArray(reg?.attendees) ? reg.attendees : [];
    const hit = attendees.find((x) => normalizeDni(String(x?.dni || "")) === dniNorm);
    if (hit) {
      foundReg = reg;
      foundAttendee = hit;
      break;
    }
  }

  if (!foundReg || !foundAttendee) {
    return res.status(404).json({ error: "No encontrado" });
  }

  const attendees: AttendeeLike[] = Array.isArray(foundReg.attendees) ? foundReg.attendees : [];
  const primaryFromAttendees =
    attendees.find((x) => x?.isPrimary) ||
    attendees[0] ||
    null;

  const primaryNameFallback =
    String(foundReg?.primary?.name || "").trim() ||
    `${foundReg?.step1?.primaryFirstName || ""} ${foundReg?.step1?.primaryLastName || ""}`.trim() ||
    "-";

  const primaryName =
    primaryFromAttendees
      ? `${primaryFromAttendees.firstName || ""} ${primaryFromAttendees.lastName || ""}`.trim() || primaryNameFallback
      : primaryNameFallback;

  const familyMembers = attendees.map((x) => ({
    fullName: `${x?.firstName || ""} ${x?.lastName || ""}`.trim() || "-",
    firstName: String(x?.firstName || ""),
    lastName: String(x?.lastName || ""),
    dni: String(x?.dni || ""),
    relation: String(x?.relation || ""),
    isPrimary: Boolean(x?.isPrimary),
    room: pickRoom(x),
    bed: pickBed(x)
  }));

  const target = {
    fullName:
      `${foundAttendee.firstName || ""} ${foundAttendee.lastName || ""}`.trim() || "-",
    firstName: String(foundAttendee.firstName || ""),
    lastName: String(foundAttendee.lastName || ""),
    dni: String(foundAttendee.dni || ""),
    relation: String(foundAttendee.relation || ""),
    isPrimary: Boolean(foundAttendee.isPrimary),
    room: pickRoom(foundAttendee),
    bed: pickBed(foundAttendee)
  };

  // Compatibilidad con la UI vieja de /mi-habitacion
  return res.json({
    room: target.room,
    bed: target.bed,
    target,
    isPrimary: target.isPrimary,
    groupType: familyMembers.length > 1 ? "familiar" : "solo",
    groupCount: familyMembers.length,
    primaryName,
    familyMembers
  });
}
