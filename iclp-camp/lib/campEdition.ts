import { env } from "@/lib/env";
import { getOrCreateRegistrationControl } from "@/lib/registrationAccess";
import { archiveCollectionName, type Pricing } from "@/lib/pure";

export { archiveCollectionName };

export type CampEdition = {
  edition: string;
  datesText: string;
  priceFull: number;
  priceNote: string;
  motto: string;
  pricing: Pricing;
};

export const DEFAULT_EDITION = {
  edition: "2026",
  datesText: "6, 7 y 8 de marzo de 2026",
  priceNote: "Valores hasta el 31/01/2026",
  motto: "“Hasta que nos venga a buscar”"
};

export const DEFAULT_PRICING: Omit<Pricing, "basePrice"> = {
  tiers: [],
  oneDayFactor: 0.5,
  freeUnderAge: 4,
  ageDiscounts: [],
  familyFrom: 5,
  familyPercent: 10
};

type TierDoc = { label?: string; price?: number; until?: string };
type AgeDoc = { maxAge?: number; percent?: number };

export async function getCampEdition(): Promise<CampEdition> {
  const control = await getOrCreateRegistrationControl();
  const basePrice = Number(control.priceFull || 0) || env.CAMP_PRICE_FULL;
  const p = control.pricing || {};

  return {
    edition: String(control.edition || DEFAULT_EDITION.edition),
    datesText: String(control.datesText || DEFAULT_EDITION.datesText),
    priceFull: basePrice,
    priceNote: String(control.priceNote || DEFAULT_EDITION.priceNote),
    motto: String(control.motto || DEFAULT_EDITION.motto),
    pricing: {
      basePrice,
      tiers: (Array.isArray(p.tiers) ? p.tiers : []).map((t: TierDoc) => ({
        label: String(t?.label || ""),
        price: Number(t?.price || 0),
        until: String(t?.until || "")
      })),
      oneDayFactor: Number(p.oneDayFactor ?? DEFAULT_PRICING.oneDayFactor),
      freeUnderAge: Number(p.freeUnderAge ?? DEFAULT_PRICING.freeUnderAge),
      ageDiscounts: (Array.isArray(p.ageDiscounts) ? p.ageDiscounts : []).map((d: AgeDoc) => ({
        maxAge: Number(d?.maxAge || 0),
        percent: Number(d?.percent || 0)
      })),
      familyFrom: Number(p.familyFrom ?? DEFAULT_PRICING.familyFrom),
      familyPercent: Number(p.familyPercent ?? DEFAULT_PRICING.familyPercent)
    }
  };
}
