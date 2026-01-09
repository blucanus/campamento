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

  // Productos (opcionales: si no están, quedan 0 y podés setear por variante en admin)
  TEE_PRICE_BUNDLE: Number(process.env.TEE_PRICE_BUNDLE || 0),
  TEE_PRICE_STANDALONE: Number(process.env.TEE_PRICE_STANDALONE || 0),
  CAP_PRICE_BUNDLE: Number(process.env.CAP_PRICE_BUNDLE || 0),
  CAP_PRICE_STANDALONE: Number(process.env.CAP_PRICE_STANDALONE || 0)
} as const;

// (Opcional) también exporto el tipo por si te sirve
export type Env = typeof env;
