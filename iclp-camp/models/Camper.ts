import { Schema, model, models } from "mongoose";

// Padron de personas: sobrevive a cada edicion del campa (no guarda pagos ni compras).
const CamperSchema = new Schema(
  {
    dni: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    sex: { type: String, default: "M" },
    relation: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },

    // DNI del principal del grupo familiar (si es el principal, su propio DNI)
    householdDni: { type: String, default: "", index: true },

    // Contacto (solo se guarda el del principal)
    email: { type: String, default: "" },
    phone: { type: String, default: "" },

    // ponytail: guardamos edad + año de carga en vez de fecha de nacimiento;
    // alcanza para sugerir la edad en la proxima edicion. Si hace falta exactitud, migrar a birthDate.
    age: { type: Number, default: 0 },
    ageYear: { type: Number, default: 0 },

    lastEdition: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Camper = models.Camper || model("Camper", CamperSchema);
