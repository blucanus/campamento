import { env } from "@/lib/env";
import { getCampEdition } from "@/lib/campEdition";
import { computeCampTotal, type Pricing } from "@/lib/pure";

type ExtraLike = { qty?: number; unitPrice?: number };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fallbackPricing(priceFull?: number): Pricing {
  return {
    basePrice: Number(priceFull || env.CAMP_PRICE_FULL || 0),
    tiers: [],
    oneDayFactor: Number(env.CAMP_PRICE_ONE_DAY_FACTOR || 0.5),
    freeUnderAge: 4,
    ageDiscounts: [],
    familyFrom: 5,
    familyPercent: 10
  };
}

/**
 * Total del campa para un grupo. `pricing` sale de la edicion vigente
 * (/admin/campa); si no se pasa, cae a los valores del env.
 */
export function computeTotalARS(step1: any, attendees: any[], pricing?: Pricing | number) {
  const config =
    typeof pricing === "object" && pricing ? pricing : fallbackPricing(pricing as number);

  const r = computeCampTotal({
    attendees: attendees || [],
    optionDays: String(step1?.optionDays || "full"),
    pricing: config,
    todayISO: todayISO()
  });

  return {
    payingPeople: r.payingPeople,
    freePeople: r.freePeople,
    pricePerPerson: r.pricePerPerson,
    tierLabel: r.tierLabel,

    discountRule:
      config.familyFrom > 0 && config.familyPercent > 0
        ? `A partir de la persona ${config.familyFrom} que paga: ${config.familyPercent}% OFF`
        : "",
    discountedFrom: config.familyFrom,
    discountedCount: r.discountedCount,

    campTotal: r.total,
    total: r.total
  };
}

/** Total a cobrar de una inscripcion ya guardada: campa + productos. Solo server. */
export async function registrationTotalARS(reg: {
  step1?: unknown;
  attendees?: unknown[];
  extras?: ExtraLike[];
}) {
  const camp = await getCampEdition();
  const base = computeTotalARS(reg.step1, (reg.attendees || []) as unknown[], camp.pricing);
  const extras = (reg.extras || []).reduce(
    (acc: number, x: ExtraLike) => acc + Number(x?.unitPrice || 0) * Number(x?.qty || 0),
    0
  );
  return Number(base.campTotal || 0) + extras;
}
