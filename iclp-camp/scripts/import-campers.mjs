// Llena el padron de personas (campers) con TODAS las inscripciones: las vivas y
// las archivadas de ediciones anteriores (registrations_2026, etc.).
// Uso: npm run import:campers
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Falta MONGODB_URI (se lee de .env.local)");

const normalizeDni = (v) => String(v || "").replace(/\D/g, "");

await mongoose.connect(uri);
const db = mongoose.connection.db;

const all = await db.listCollections().toArray();
const names = all
  .map((c) => c.name)
  .filter((n) => n === "registrations" || n.startsWith("registrations_"))
  // Las archivadas primero: si una persona aparece en varias, gana la mas reciente.
  .sort((a, b) => (a === "registrations" ? 1 : b === "registrations" ? -1 : a.localeCompare(b)));

console.log("Colecciones a procesar:", names.join(", ") || "(ninguna)");

const campers = db.collection("campers");
await campers.createIndex({ dni: 1 }, { unique: true });

let vistos = 0;
let guardados = 0;

for (const name of names) {
  const docs = await db
    .collection(name)
    .find({}, { projection: { attendees: 1, primary: 1, step1: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  const edition = name === "registrations" ? "actual" : name.replace("registrations_", "");

  for (const reg of docs) {
    const list = Array.isArray(reg.attendees) ? reg.attendees : [];
    const primary = list.find((a) => a?.isPrimary) || list[0];
    const householdDni = normalizeDni(primary?.dni);
    const year = reg.createdAt ? new Date(reg.createdAt).getFullYear() : new Date().getFullYear();

    for (const a of list) {
      const dni = normalizeDni(a?.dni);
      if (!dni) continue;
      vistos++;

      const isPrimary = Boolean(a?.isPrimary);
      const contacto = isPrimary
        ? {
            email: String(reg.primary?.email || reg.step1?.email || "").trim(),
            phone: String(reg.primary?.phone || reg.step1?.phone || "").trim()
          }
        : {};

      await campers.updateOne(
        { dni },
        {
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
            lastEdition: edition,
            updatedAt: new Date(),
            ...contacto
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
      guardados++;
    }
  }

  console.log(`${name}: ${docs.length} inscripciones`);
}

console.log(`\nIntegrantes recorridos: ${vistos}`);
console.log(`Personas en el padron: ${await campers.countDocuments({})} (upserts: ${guardados})`);

await mongoose.disconnect();
