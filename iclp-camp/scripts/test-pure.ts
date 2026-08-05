import assert from "node:assert/strict";
import {
  archiveCollectionName,
  bumpAge,
  computeCampTotal,
  normalizeDni,
  normalizePhoneAR,
  resolveTierPrice,
  sanitizePosId
} from "../lib/pure.ts";

// DNI
assert.equal(normalizeDni("30.123.456"), "30123456");
assert.equal(normalizeDni(null), "");

// Edad: envejece segun el año en que se cargo
assert.equal(bumpAge(10, 2026, 2028), 12);
assert.equal(bumpAge(10, 2026, 2026), 10);
assert.equal(bumpAge(10, 2026, 2025), 10); // nunca rejuvenece
assert.equal(bumpAge(0, 2026, 2028), 0); // sin edad cargada, no inventa
assert.equal(bumpAge(10, 0, 2028), 10); // sin año de carga, no toca

// Nombre de coleccion de archivo (se usa para NO pisar ediciones viejas)
assert.equal(archiveCollectionName("registrations", "2026"), "registrations_2026");
assert.equal(archiveCollectionName("registrations", "2027 / Marzo"), "registrations_2027_marzo");
assert.equal(archiveCollectionName("merchorders", ""), "merchorders_sin_edicion");

// El external_id de la caja de MP tiene que ser alfanumerico
assert.equal(sanitizePosId("CAMP-01"), "CAMP01");
assert.equal(sanitizePosId("caja 1"), "CAJA1");
assert.equal(sanitizePosId("---"), "CAMP01");

// Telefono -> WhatsApp
assert.equal(normalizePhoneAR("221 15 555-1234").wa, "5492215551234");
assert.equal(normalizePhoneAR("02215551234").wa, "5492215551234");
assert.equal(normalizePhoneAR("+54 9 221 555 1234").wa, "5492215551234");
assert.equal(normalizePhoneAR("2215551234").display, "+54 9 221 555-1234");
assert.equal(normalizePhoneAR("123").ok, false);

// Precios
const pricing = {
  basePrice: 60000,
  tiers: [
    { label: "Anticipado", price: 63000, until: "2026-01-31" },
    { label: "General", price: 75000, until: "2026-03-08" }
  ],
  oneDayFactor: 0.5,
  freeUnderAge: 4,
  ageDiscounts: [{ maxAge: 12, percent: 50 }],
  familyFrom: 5,
  familyPercent: 10
};

// Tramo vigente segun la fecha
assert.equal(resolveTierPrice(pricing, "2026-01-15").price, 63000);
assert.equal(resolveTierPrice(pricing, "2026-02-15").price, 75000);
assert.equal(resolveTierPrice(pricing, "2027-01-01").price, 75000); // vencidos: vale el ultimo
assert.equal(resolveTierPrice({ ...pricing, tiers: [] }, "2026-02-15").price, 60000);

// Dos adultos, todo el campa
assert.equal(
  computeCampTotal({
    attendees: [{ age: 40 }, { age: 38 }],
    optionDays: "full",
    pricing,
    todayISO: "2026-01-15"
  }).total,
  126000
);

// Menor de 4 no paga; nene de 10 paga la mitad
const familia = computeCampTotal({
  attendees: [{ age: 40 }, { age: 38 }, { age: 10 }, { age: 2 }],
  optionDays: "full",
  pricing,
  todayISO: "2026-01-15"
});
assert.equal(familia.total, 63000 * 2 + 31500);
assert.equal(familia.payingPeople, 3);
assert.equal(familia.freePeople, 1);

// A partir del 5to que paga: 10% off, empezando por los mas baratos
const numerosa = computeCampTotal({
  attendees: [{ age: 40 }, { age: 38 }, { age: 20 }, { age: 18 }, { age: 16 }, { age: 10 }],
  optionDays: "full",
  pricing,
  todayISO: "2026-01-15"
});
assert.equal(numerosa.discountedCount, 2);
assert.equal(numerosa.total, 63000 * 4 + Math.round(63000 * 0.9) + Math.round(31500 * 0.9));

// 1 dia paga la mitad
assert.equal(
  computeCampTotal({
    attendees: [{ age: 40 }],
    optionDays: "1",
    pricing,
    todayISO: "2026-01-15"
  }).total,
  31500
);

// Sin descuentos configurados no se aplica ninguno
assert.equal(
  computeCampTotal({
    attendees: [{ age: 2 }, { age: 10 }],
    optionDays: "full",
    pricing: { ...pricing, freeUnderAge: 0, ageDiscounts: [], familyFrom: 0 },
    todayISO: "2026-01-15"
  }).total,
  126000
);

console.log("ok");
