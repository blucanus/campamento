import mongoose, { Schema, models, model } from "mongoose";

const LodgingSchema = new Schema(
  {
    type: { type: String, default: "none" }, // none | bunk | dept
    room: { type: String, default: "" },
    bed: { type: String, default: "none" } // arriba | abajo | none
  },
  { _id: false }
);

const AttendeeSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    dni: String,
    age: Number,
    relation: String,
    diet: String,
    sex: String,
    isPrimary: { type: Boolean, default: false },
    lodging: { type: LodgingSchema, default: {} }
  },
  { _id: true }
);

const ExtrasSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant" },
    sku: String,
    name: String,
    attributes: {
      design: String,
      color: String,
      size: String
    },
    qty: Number,
    unitPrice: Number
  },
  { _id: false }
);

const RegistrationSchema = new Schema(
  {
    // Paso 1 completo (nuevo flujo)
    step1: {
      type: Object,
      default: null
    },

    // Normalizado para admin / mails / compatibilidad
    primary: {
      name: String,
      phone: String,
      email: String
    },

    attendees: {
      type: [AttendeeSchema],
      default: []
    },

    // Productos comprados
    extras: {
      type: [ExtrasSchema],
      default: []
    },

    // ✅ NUEVO: control de entrega de productos
    extrasDelivered: {
      type: Boolean,
      default: false
    },
    extrasDeliveredAt: {
      type: Date,
      default: null
    },
    extrasDeliveredBy: {
      type: String,
      default: ""
    },

    payment: {
      status: { type: String, default: "pending" }, // pending | approved | rejected
      preferenceId: String,
      paymentId: String,
      initPoint: String,
      lastEventAt: Date
    }
  },
  {
    timestamps: true
  }
);

export const Registration =
  models.Registration || model("Registration", RegistrationSchema);
