import { Schema, model, models } from "mongoose";

const RegistrationControlSchema = new Schema(
  {
    singleton: { type: String, default: "main", unique: true },
    registrationsOpen: { type: Boolean, default: true },

    // Edicion vigente del campa (lo que se ve en la landing y en los mails)
    edition: { type: String, default: "2026" },
    datesText: { type: String, default: "6, 7 y 8 de marzo de 2026" },
    priceFull: { type: Number, default: 0 }, // 0 = usar CAMP_PRICE_FULL del env
    priceNote: { type: String, default: "" },
    motto: { type: String, default: "" },

    // Precios por tramo de fecha y descuentos (se editan en /admin/campa)
    pricing: {
      tiers: {
        type: [
          {
            _id: false,
            label: { type: String, default: "" },
            price: { type: Number, default: 0 },
            until: { type: String, default: "" } // YYYY-MM-DD
          }
        ],
        default: []
      },
      oneDayFactor: { type: Number, default: 0.5 },
      freeUnderAge: { type: Number, default: 4 },
      ageDiscounts: {
        type: [
          {
            _id: false,
            maxAge: { type: Number, default: 0 },
            percent: { type: Number, default: 0 }
          }
        ],
        default: []
      },
      familyFrom: { type: Number, default: 5 },
      familyPercent: { type: Number, default: 10 }
    }
  },
  { timestamps: true }
);

export const RegistrationControl =
  models.RegistrationControl || model("RegistrationControl", RegistrationControlSchema);

