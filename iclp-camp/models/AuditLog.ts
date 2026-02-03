import { Schema, models, model } from "mongoose";

const AuditLogSchema = new Schema(
  {
    actor: {
      id: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
    },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    ua: { type: String, default: "" },
  },
  { minimize: false, timestamps: true }
);

export const AuditLog = models.AuditLog || model("AuditLog", AuditLogSchema);
