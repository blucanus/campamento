import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { IncomingForm } from "formidable";
import { put } from "@vercel/blob";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/Registration";

export const config = {
  api: { bodyParser: false }
};

// helpers tipados (sin any implícito)
type FormFields = Record<string, any>;
type FormFile = {
  filepath: string;
  originalFilename?: string | null;
  mimetype?: string | null;
  size?: number;
};
type FormFiles = Record<string, FormFile | FormFile[]>;

function parseForm(req: NextApiRequest): Promise<{ fields: FormFields; files: FormFiles }> {
  const form = new IncomingForm({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err: unknown, fields: FormFields, files: FormFiles) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function pickFirstFile(x: FormFile | FormFile[] | undefined): FormFile | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] || null) : x;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });

    const { fields, files } = await parseForm(req);

    const registrationId = String(fields.registrationId || "").trim();
    const attendeeId = String(fields.attendeeId || "").trim();

    if (!registrationId || !attendeeId) {
      return res.status(400).json({ error: "Faltan fields: registrationId y attendeeId" });
    }

    const f = pickFirstFile(files.file as any);
    if (!f) return res.status(400).json({ error: "Falta archivo (file)" });

    // Validar tipo (aceptamos PDF o imagen)
    const mimetype = String(f.mimetype || "");
    const allowed =
      mimetype === "application/pdf" ||
      mimetype.startsWith("image/");

    if (!allowed) {
      return res.status(400).json({ error: "Formato inválido. Subí PDF o imagen (JPG/PNG)." });
    }

    const original = String(f.originalFilename || "consent.pdf");
    const safe = original.replace(/[^a-zA-Z0-9._-]/g, "_");

    const buffer = await fs.promises.readFile(f.filepath);

    // Subida a Vercel Blob
    const pathname = `consents/${registrationId}/${attendeeId}-${Date.now()}-${safe}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      token,
      contentType: mimetype || undefined
    });

    // Guardar URL en el attendee
    await connectDB();

    const reg = await Registration.findOne({ _id: registrationId }).lean();
    if (!reg) return res.status(404).json({ error: "Inscripción no encontrada" });

    // actualiza SOLO ese integrante
    const result = await Registration.updateOne(
      { _id: registrationId, "attendees._id": attendeeId },
      {
        $set: {
          "attendees.$.consentRequired": true,
          "attendees.$.consentUrl": blob.url
        }
      }
    );

    if (!result.modifiedCount) {
      return res.status(400).json({ error: "No se pudo asociar el archivo al integrante (attendeeId inválido?)" });
    }

    return res.status(200).json({ ok: true, url: blob.url });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Upload error" });
  }
}
