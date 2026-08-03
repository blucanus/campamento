import { Camper } from "@/models/Camper";
import { bumpAge, normalizeDni } from "@/lib/pure";

export { bumpAge, normalizeDni };

export type CamperLite = {
  dni: string;
  firstName: string;
  lastName: string;
  sex: string;
  relation: string;
  isPrimary: boolean;
  age: number;
};

type AttendeeLike = {
  firstName?: string;
  lastName?: string;
  dni?: string;
  sex?: string;
  relation?: string;
  isPrimary?: boolean;
  age?: unknown;
};

/**
 * Guarda/actualiza el padron de personas a partir de los integrantes de una inscripcion.
 * Nunca debe romper el flujo de inscripcion: los call sites lo envuelven en try/catch.
 */
export async function saveCampers(params: {
  attendees: AttendeeLike[];
  email?: string;
  phone?: string;
  edition?: string;
}) {
  const list = Array.isArray(params.attendees) ? params.attendees : [];
  const primary = list.find((a) => a?.isPrimary) || list[0];
  const householdDni = normalizeDni(primary?.dni);
  const year = new Date().getFullYear();

  const ops = list.flatMap((a) => {
    const dni = normalizeDni(a?.dni);
    if (!dni) return [];

    const isPrimary = Boolean(a?.isPrimary);
    const contact = isPrimary
      ? {
          email: String(params.email || "").trim(),
          phone: String(params.phone || "").trim()
        }
      : {};

    return [
      {
        updateOne: {
          filter: { dni },
          update: {
            $set: {
              dni,
              firstName: String(a?.firstName || "").trim(),
              lastName: String(a?.lastName || "").trim(),
              sex: String(a?.sex || "M"),
              relation: String(a?.relation || ""),
              isPrimary,
              householdDni: householdDni || dni,
              age: Number(a?.age || 0),
              ageYear: year,
              lastEdition: String(params.edition || ""),
              ...contact
            }
          },
          upsert: true
        }
      }
    ];
  });

  if (!ops.length) return { saved: 0 };
  await Camper.bulkWrite(ops, { ordered: false });
  return { saved: ops.length };
}

type CamperDoc = {
  dni?: string;
  firstName?: string;
  lastName?: string;
  sex?: string;
  relation?: string;
  isPrimary?: boolean;
  householdDni?: string;
  email?: string;
  phone?: string;
  age?: number;
  ageYear?: number;
};

export function toLite(doc: CamperDoc, currentYear: number): CamperLite {
  return {
    dni: String(doc.dni || ""),
    firstName: String(doc.firstName || ""),
    lastName: String(doc.lastName || ""),
    sex: String(doc.sex || "M"),
    relation: String(doc.relation || ""),
    isPrimary: Boolean(doc.isPrimary),
    age: bumpAge(doc.age, doc.ageYear, currentYear)
  };
}

/** Busca una persona por DNI y devuelve todo su grupo familiar (principal primero). */
export async function findHousehold(dniInput: unknown) {
  const dni = normalizeDni(dniInput);
  if (!dni) return null;

  const me = (await Camper.findOne({ dni }).lean()) as CamperDoc | null;
  if (!me) return null;

  const key = String(me.householdDni || me.dni || dni);
  const docs = (await Camper.find({
    $or: [{ householdDni: key }, { dni: key }]
  }).lean()) as CamperDoc[];

  const year = new Date().getFullYear();
  const members = docs
    .map((d) => toLite(d, year))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const primaryDoc = docs.find((d) => String(d.dni || "") === key) || me;

  return {
    person: toLite(me, year),
    isPrimary: String(me.dni || "") === key,
    householdDni: key,
    members,
    // El contacto solo se expone si consultan con el DNI del principal.
    email: String(me.dni || "") === key ? String(primaryDoc.email || "") : "",
    phone: String(me.dni || "") === key ? String(primaryDoc.phone || "") : ""
  };
}
