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

/** Nombre de coleccion para archivar una edicion: "2026 / marzo" -> "registrations_2026_marzo" */
export function archiveCollectionName(prefix: string, edition: string) {
  const slug = String(edition || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}_${slug || "sin_edicion"}`;
}
