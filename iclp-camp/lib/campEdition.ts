import { env } from "@/lib/env";
import { getOrCreateRegistrationControl } from "@/lib/registrationAccess";
import { archiveCollectionName } from "@/lib/pure";

export { archiveCollectionName };

export type CampEdition = {
  edition: string;
  datesText: string;
  priceFull: number;
  priceNote: string;
  motto: string;
};

export const DEFAULT_EDITION: CampEdition = {
  edition: "2026",
  datesText: "6, 7 y 8 de marzo de 2026",
  priceFull: 0,
  priceNote: "Valores hasta el 31/01/2026",
  motto: "“Hasta que nos venga a buscar”"
};

export async function getCampEdition(): Promise<CampEdition> {
  const control = await getOrCreateRegistrationControl();
  return {
    edition: String(control.edition || DEFAULT_EDITION.edition),
    datesText: String(control.datesText || DEFAULT_EDITION.datesText),
    priceFull: Number(control.priceFull || 0) || env.CAMP_PRICE_FULL,
    priceNote: String(control.priceNote || DEFAULT_EDITION.priceNote),
    motto: String(control.motto || DEFAULT_EDITION.motto)
  };
}

