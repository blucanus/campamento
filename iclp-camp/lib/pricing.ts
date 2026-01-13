import { env } from "@/lib/env";

export function computeTotalARS(step1: any, attendees: any[]) {
  const campFull = Number(env.CAMP_PRICE_FULL || 0);
  const oneDayFactor = Number(env.CAMP_PRICE_ONE_DAY_FACTOR || 0.5);

  // Personas que pagan: edad >= 4
  const payingPeople = (attendees || []).filter((a: any) => Number(a.age || 0) >= 4).length;

  // Determinar factor según días (1 día = 50%, 2 días o full = 100%)
  const optionDays = String(step1?.optionDays || "full"); // "1" | "2" | "full"
  const dayFactor = optionDays === "1" ? oneDayFactor : 1;

  // Precio base por persona (antes de descuento por 5to+)
  const pricePerPerson = campFull * dayFactor;

  // ✅ Descuento por familiar:
  // Desde la 5ta persona que paga -> 10% OFF al precio individual
  const normalCount = Math.min(4, payingPeople);
  const discountedCount = Math.max(0, payingPeople - 4);

  // redondeo para evitar decimales raros
  const discountedPricePerPerson = Math.round(pricePerPerson * 0.9);

  const campTotal =
    normalCount * pricePerPerson +
    discountedCount * discountedPricePerPerson;

  return {
    payingPeople,
    pricePerPerson,

    // info del descuento (para mostrar en UI si querés)
    discountRule: "A partir del 5to miembro que paga: 10% OFF individual",
    discountedFrom: 5,
    normalCount,
    discountedCount,
    discountedPricePerPerson,

    // total del campa (sin extras)
    campTotal,

    // compatibilidad con tu código anterior
    total: campTotal
  };
}
