import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import { NextApiRequest, NextApiResponse } from "next";

type AttendeeLike = {
  firstName?: string;
  lastName?: string;
  dni?: string;
  relation?: string;
  isPrimary?: boolean;
  room?: string;
  bed?: string;
  type?: string;
  lodging?: {
    room?: string;
    bed?: string;
    type?: string;
  };
};

type LodgingType = "none" | "bunk" | "dept";
type RegistrationLite = {
  createdAt?: string | Date;
  updatedAt?: string | Date;
  payment?: {
    status?: string;
  };
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
  return String(a?.lodging?.room || a?.room || "").trim() || "-";
}

function pickBed(a: AttendeeLike | undefined) {
  return String(a?.lodging?.bed || a?.bed || "").trim() || "-";
}

function pickLodgingType(a: AttendeeLike | undefined): LodgingType {
  const value = String(a?.lodging?.type || a?.type || "none").trim().toLowerCase();
  if (value === "bunk" || value === "dept") return value;
  return "none";
}

function hasAssignedLodging(a: AttendeeLike | undefined) {
  const room = pickRoom(a);
  const bed = pickBed(a);
  const type = pickLodgingType(a);
  if (type === "dept") return room !== "-";
  if (type === "bunk") return room !== "-";
  return room !== "-" || (bed !== "-" && bed !== "none");
}

function getRankTimestamp(reg: RegistrationLite) {
  const updated = reg?.updatedAt ? new Date(reg.updatedAt).getTime() : 0;
  if (Number.isFinite(updated) && updated > 0) return updated;
  const created = reg?.createdAt ? new Date(reg.createdAt).getTime() : 0;
  return Number.isFinite(created) && created > 0 ? created : 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  await connectDB();
  const dniRaw = String(req.query.dni || "").trim();
  const dniNorm = normalizeDni(dniRaw);
  if (!dniNorm) return res.status(400).json({ error: "DNI requerido" });

  const regs = await Registration.find({})
    .select("attendees primary step1 createdAt updatedAt payment")
    .lean();

  const matches: Array<{
    reg: RegistrationLite;
    attendee: AttendeeLike;
    hasLodging: boolean;
    isApproved: boolean;
    timestamp: number;
  }> = [];

  for (const reg of regs as RegistrationLite[]) {
    const attendees: AttendeeLike[] = Array.isArray(reg?.attendees) ? reg.attendees : [];
    for (const x of attendees) {
      if (normalizeDni(String(x?.dni || "")) !== dniNorm) continue;
      matches.push({
        reg,
        attendee: x,
        hasLodging: hasAssignedLodging(x),
        isApproved: String(reg?.payment?.status || "").toLowerCase() === "approved",
        timestamp: getRankTimestamp(reg)
      });
    }
  }

  if (matches.length === 0) {
    return res.status(404).json({ error: "No encontrado" });
  }

  matches.sort((a, b) => {
    if (a.hasLodging !== b.hasLodging) return a.hasLodging ? -1 : 1;
    if (a.isApproved !== b.isApproved) return a.isApproved ? -1 : 1;
    return b.timestamp - a.timestamp;
  });

  const best = matches[0];
  const foundReg = best.reg;
  const foundAttendee = best.attendee;

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
    lodgingType: pickLodgingType(x),
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
    lodgingType: pickLodgingType(foundAttendee),
    room: pickRoom(foundAttendee),
    bed: pickBed(foundAttendee)
  };

  // Compatibilidad con la UI vieja de /mi-habitacion
  return res.json({
    lodgingType: target.lodgingType,
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
