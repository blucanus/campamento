export const env = {
  // App
  APP_URL: process.env.APP_URL || "http://localhost:3000",

  // Mongo
  MONGODB_URI: process.env.MONGODB_URI || "",

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || "change-me",

  // Mercado Pago
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || "",
  MP_NOTIFICATION_URL:
    process.env.MP_NOTIFICATION_URL || "http://localhost:3000/api/webhooks/mercadopago",

  // Pricing campa
  CAMP_PRICE_FULL: Number(process.env.CAMP_PRICE_FULL || 63000),
  CAMP_PRICE_ONE_DAY_FACTOR: Number(process.env.CAMP_PRICE_ONE_DAY_FACTOR || 0.5),

  // Productos (opcionales)
  TEE_PRICE_BUNDLE: Number(process.env.TEE_PRICE_BUNDLE || 0),
  TEE_PRICE_STANDALONE: Number(process.env.TEE_PRICE_STANDALONE || 0),
  CAP_PRICE_BUNDLE: Number(process.env.CAP_PRICE_BUNDLE || 0),
  CAP_PRICE_STANDALONE: Number(process.env.CAP_PRICE_STANDALONE || 0),

  // ✅ SMTP (para notify.ts)
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "" // ej: "ICLP Campa <no-reply@tudominio.com>"
} as const;

export type Env = typeof env;
