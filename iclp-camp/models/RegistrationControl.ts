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
    motto: { type: String, default: "" }
  },
  { timestamps: true }
);

export const RegistrationControl =
  models.RegistrationControl || model("RegistrationControl", RegistrationControlSchema);

