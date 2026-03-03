import { Schema, model, models } from "mongoose";

const RegistrationControlSchema = new Schema(
  {
    singleton: { type: String, default: "main", unique: true },
    registrationsOpen: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const RegistrationControl =
  models.RegistrationControl || model("RegistrationControl", RegistrationControlSchema);

