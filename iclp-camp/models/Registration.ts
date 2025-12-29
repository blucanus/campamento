import { Schema, model, models } from "mongoose";

const AttendeeSchema = new Schema({
  firstName: String,
  lastName: String,
  dni: { type: String, index: true },
  age: Number,
  relation: String,
  diet: String,
  sex: String,
  isPrimary: Boolean,
  qrToken: { type: String, index: true },
  checkedInAt: { type: Date, default: null },
  lodging: {
    type: { type: String, enum: ["bunk", "dept", "none"], default: "none" },
    room: { type: String, default: "" },
    bed: { type: String, enum: ["arriba", "abajo", "none"], default: "none" }
  }
});

const RegistrationSchema = new Schema({
  primary: { name: String, phone: String, email: String },
  attendance: { optionDays: String, daysDetail: String },
  attendees: [AttendeeSchema],
  payment: {
    status: { type: String, default: "pending" }
  }
}, { timestamps: true });

export const Registration = models.Registration || model("Registration", RegistrationSchema);
