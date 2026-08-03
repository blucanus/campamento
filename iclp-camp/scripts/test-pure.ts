import assert from "node:assert/strict";
import { archiveCollectionName, bumpAge, normalizeDni } from "../lib/pure.ts";

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

console.log("ok");
