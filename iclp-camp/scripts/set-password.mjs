// Cambia la clave de un usuario del panel.
// Uso: npm run pass -- alguien@mail.com "ClaveNueva" [rol]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const [emailRaw, pass, role] = process.argv.slice(2);
if (!emailRaw || !pass) {
  console.error('Uso: npm run pass -- alguien@mail.com "ClaveNueva" [admin|superadmin|staff]');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Falta MONGODB_URI (se lee de .env.local)");

const email = emailRaw.toLowerCase().trim();

await mongoose.connect(uri);
const users = mongoose.connection.collection("users");

const found = await users.findOne({ email });
if (!found) {
  console.error(`No existe ningun usuario con email ${email}. Los que hay:`);
  for (const u of await users.find({}).project({ email: 1, role: 1, isActive: 1 }).toArray()) {
    console.error(" -", u.email, "| rol:", u.role, "| activo:", u.isActive);
  }
  await mongoose.disconnect();
  process.exit(1);
}

const passwordHash = await bcrypt.hash(pass, 10);
await users.updateOne(
  { email },
  { $set: { passwordHash, isActive: true, ...(role ? { role } : {}) } }
);

// Releemos y comprobamos contra lo que quedo guardado de verdad.
const after = await users.findOne({ email });
console.log("Usuario:", after.email, "| rol:", after.role, "| activo:", after.isActive);
console.log("Clave verificada:", bcrypt.compareSync(pass, after.passwordHash) ? "OK" : "FALLA");

await mongoose.disconnect();
