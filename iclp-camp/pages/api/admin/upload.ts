import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";
import { put } from "@vercel/blob";
import fs from "fs";
import { IncomingForm, type File } from "formidable";

export const config = {
  api: {
    bodyParser: false, // necesario para multipart/form-data
  },
};

type Parsed = { fields: Record<string, any>; files: Record<string, File | File[]> };

function parseForm(req: NextApiRequest): Promise<Parsed> {
  const form = new IncomingForm({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields: fields as any, files: files as any });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });

    const { fields, files } = await parseForm(req);

    const f = files.file;
    const file = (Array.isArray(f) ? f[0] : f) || null;
    if (!file) return res.status(400).json({ error: "Falta archivo (file)" });

    const folder = String(fields.folder || "products").replace(/[^a-zA-Z0-9/_-]/g, "");
    const originalName = String(file.originalFilename || "upload.bin");
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // En formidable, filepath existe (temp file)
    const buffer = await fs.promises.readFile((file as any).filepath);

    const pathname = `${folder}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      token,
      contentType: file.mimetype || undefined,
    });

    return res.status(200).json({
      ok: true,
      url: blob.url,          // ✅ guardás esto en photoUrl
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: blob.size,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Upload error" });
  }
}
