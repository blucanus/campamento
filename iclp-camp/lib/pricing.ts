import { env } from "@/lib/env";

export function computeTotalARS(step1: any, attendees: any[]) {
  const full = env.CAMP_PRICE_FULL; // 63000
  const oneDay = Math.round(full * env.CAMP_PRICE_ONE_DAY_FACTOR); // 31500

  // menores de 4 no pagan
  const payingPeople = (attendees || []).filter(a => Number(a.age || 0) >= 4).length;

  const option = step1.optionDays; // "1" | "2" | "full"
  const pricePerPerson = option === "1" ? oneDay : full; // 2 días o full => full

  const total = payingPeople * pricePerPerson;
  return { total, payingPeople, pricePerPerson };
}
