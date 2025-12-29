import nodemailer from "nodemailer";
import { env } from "@/lib/env";

export async function sendConfirmationEmail(to: string, subject: string, html: string) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return { skipped: true, reason: "SMTP not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });

  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
  return { ok: true };
}
