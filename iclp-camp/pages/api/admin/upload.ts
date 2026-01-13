import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";
import { put } from "@vercel/blob";
import fs from "fs";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  const form = formidable({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err: any, fields: any, files: any) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { files, fields } = await parseForm(req);

    const file: any = files?.file?.[0] || files?.file || null;
    if (!file) return res.status(400).json({ error: "Falta archivo (file)" });

    const folder = String(fields?.folder || "products").replace(/[^a-zA-Z0-9/_-]/g, "");
    const originalName = String(file.originalFilename || file.newFilename || "upload.bin");
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });

    const buffer = await fs.promises.readFile(file.filepath);
    const pathname = `${folder}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      token,
      contentType: file.mimetype || undefined,
    });

    return res.status(200).json({
      ok: true,
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Upload error" });
  }
}
