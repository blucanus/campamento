import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { checkRegistrationAccess } from "@/lib/registrationAccess";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  await connectDB();

  const code = String(req.query.code || "");
  const regId = String(req.query.regId || "");
  const check = await checkRegistrationAccess({ code, regId });

  return res.status(200).json({
    allowed: check.allowed,
    registrationsOpen: check.registrationsOpen,
    source: check.source,
    code: check.code,
    message:
      check.reason ||
      (check.registrationsOpen
        ? "Inscripciones abiertas."
        : "Acceso especial habilitado por codigo.")
  });
}

