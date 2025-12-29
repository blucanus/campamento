export const env = {
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  MONGODB_URI: process.env.MONGODB_URI || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "Campamento ICLP <no-reply@iclp.org>"
};
