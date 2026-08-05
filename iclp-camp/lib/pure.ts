// Helpers sin dependencias (se testean con: npm run test)

export function normalizeDni(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

// La edad guardada envejece sola: si se cargo en 2026 y estamos en 2028, sugiere +2.
export function bumpAge(age: unknown, ageYear: unknown, currentYear: number) {
  const a = Number(age || 0);
  const y = Number(ageYear || 0);
  if (!a || !y || currentYear <= y) return a;
  return a + (currentYear - y);
}

// ---- Telefono / WhatsApp ----

/**
 * Normaliza un telefono argentino al formato que usa WhatsApp (54 9 + area + numero,
 * sin 0 ni 15). Devuelve ok:false si no llega a 10 digitos utiles.
 */
export function normalizePhoneAR(input: unknown) {
  let digits = String(input || "").replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);

  // El 15 va despues del area (2 a 4 digitos): 221 15 5551234.
  // Solo lo sacamos si sobran digitos y el resultado queda en los 10 de un numero real,
  // asi no le comemos el "15" a un numero que ya viene bien (2215551234).
  if (digits.length >= 11) {
    const m = digits.match(/^(\d{2,4})15(\d{6,8})$/);
    if (m && (m[1] + m[2]).length === 10) digits = m[1] + m[2];
  }

  if (digits.length < 10) return { ok: false, wa: "", display: String(input || "") };

  const local = digits.slice(-10);
  const wa = `549${local}`;
  return {
    ok: true,
    wa,
    display: `+54 9 ${local.slice(0, 3)} ${local.slice(3, 6)}-${local.slice(6)}`
  };
}

// ---- Precios del campa ----

export type PriceTier = { label: string; price: number; until: string };
export type AgeDiscount = { maxAge: number; percent: number };
export type Pricing = {
  basePrice: number;
  tiers: PriceTier[];
  oneDayFactor: number;
  freeUnderAge: number;
  ageDiscounts: AgeDiscount[];
  familyFrom: number;
  familyPercent: number;
};

/** Precio vigente: el primer tramo cuyo "hasta" todavia no paso. */
export function resolveTierPrice(pricing: Pricing, todayISO: string) {
  const tiers = (pricing.tiers || [])
    .filter((t) => t && Number(t.price) > 0 && t.until)
    .sort((a, b) => String(a.until).localeCompare(String(b.until)));

  const vigente = tiers.find((t) => String(t.until) >= todayISO);
  if (vigente) return { price: Number(vigente.price), label: vigente.label || "" };

  // Si ya vencieron todos, vale el ultimo tramo cargado; si no hay tramos, el precio base.
  const ultimo = tiers[tiers.length - 1];
  if (ultimo) return { price: Number(ultimo.price), label: ultimo.label || "" };
  return { price: Number(pricing.basePrice || 0), label: "" };
}

function ageDiscountPercent(age: number, list: AgeDiscount[]) {
  const match = (list || [])
    .filter((d) => d && Number(d.maxAge) > 0 && age <= Number(d.maxAge))
    .sort((a, b) => Number(a.maxAge) - Number(b.maxAge))[0];
  return match ? Math.min(100, Math.max(0, Number(match.percent || 0))) : 0;
}

/**
 * Total del campa. Por persona: gratis si es menor que freeUnderAge, si no el precio
 * vigente con el descuento por edad que le toque. El descuento familiar se aplica a
 * partir de la persona numero `familyFrom` que paga, empezando por las mas baratas.
 */
export function computeCampTotal(params: {
  attendees: { age?: unknown }[];
  optionDays?: string;
  pricing: Pricing;
  todayISO: string;
}) {
  const { price, label } = resolveTierPrice(params.pricing, params.todayISO);
  const dayFactor = String(params.optionDays || "full") === "1"
    ? Number(params.pricing.oneDayFactor || 1)
    : 1;

  const freeUnderAge = Number(params.pricing.freeUnderAge || 0);
  const familyFrom = Math.max(0, Number(params.pricing.familyFrom || 0));
  const familyPercent = Math.min(100, Math.max(0, Number(params.pricing.familyPercent || 0)));

  const units: number[] = [];
  let freeCount = 0;

  for (const a of params.attendees || []) {
    const age = Number(a?.age || 0);
    if (freeUnderAge > 0 && age < freeUnderAge) {
      freeCount++;
      continue;
    }
    const off = ageDiscountPercent(age, params.pricing.ageDiscounts);
    units.push(Math.round(price * dayFactor * (1 - off / 100)));
  }

  // Los que pagan menos son los que se llevan el descuento familiar.
  units.sort((a, b) => b - a);

  let total = 0;
  let discountedCount = 0;
  units.forEach((unit, idx) => {
    const aplica = familyFrom > 0 && familyPercent > 0 && idx + 1 >= familyFrom;
    if (aplica) discountedCount++;
    total += aplica ? Math.round(unit * (1 - familyPercent / 100)) : unit;
  });

  return {
    total,
    pricePerPerson: Math.round(price * dayFactor),
    tierLabel: label,
    payingPeople: units.length,
    freePeople: freeCount,
    discountedCount
  };
}

/** Nombre de coleccion para archivar una edicion: "2026 / marzo" -> "registrations_2026_marzo" */
export function archiveCollectionName(prefix: string, edition: string) {
  const slug = String(edition || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}_${slug || "sin_edicion"}`;
}
