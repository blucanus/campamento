import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";
import formidable from "formidable";
import fs from "fs";
import { put } from "@vercel/blob";

export const config = {
  api: { bodyParser: false }
};

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  const form = formidable({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024
  });

  return new Promise((resolve, reject) => {
    form.parse(req as any, (err: any, fields: any, files: any) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function extFrom(file: any) {
  const name = String(file?.originalFilename || "");
  const byName = name.includes(".") ? name.split(".").pop() : "";
  if (byName) return byName.toLowerCase();

  const mt = String(file?.mimetype || "");
  if (mt.includes("pdf")) return "pdf";
  if (mt.includes("png")) return "png";
  if (mt.includes("jpeg") || mt.includes("jpg")) return "jpg";
  return "bin";
}

function makeCode() {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `CONSENT-${ts}-${rnd}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { fields, files } = await parseForm(req);

    const registrationId = String(fields.registrationId || "").trim();
    const attendeeId = String(fields.attendeeId || "").trim();
    if (!registrationId || !attendeeId) {
      return res.status(400).json({ error: "Missing registrationId/attendeeId" });
    }

    let file: any = files?.file;
    if (Array.isArray(file)) file = file[0];
    if (!file) return res.status(400).json({ error: "Falta archivo (file)" });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });

    const filepath = file?.filepath || file?._writeStream?.path || file?.path;
    if (!filepath) return res.status(400).json({ error: "Archivo inválido (sin ruta)" });

    const buffer = await fs.promises.readFile(filepath);
    const ext = extFrom(file);
    const code = makeCode();

    // ✅ nombre/código como filename
    const pathname = `consents/${registrationId}/${code}.${ext}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      token,
      contentType: file.mimetype || undefined
    });

    await connectDB();

    // ✅ actualiza dentro del attendee correspondiente
    const upd = await Registration.updateOne(
      { _id: registrationId, "attendees._id": attendeeId },
      {
        $set: {
          "attendees.$.consentRequired": true,
          "attendees.$.consentUrl": blob.url,
          "attendees.$.consentCode": code
        }
      }
    );

    if (!upd.matchedCount) {
      return res.status(404).json({ error: "No se encontró inscripción o integrante" });
    }

    return res.status(200).json({
      ok: true,
      url: blob.url,
      code,
      pathname
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Upload error" });
  }
}
