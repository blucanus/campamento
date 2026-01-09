import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  if (req.method === "GET") {
    const products = await Product.find({}).sort({ type: 1 });
    return res.status(200).json(
      products.map((p: any) => ({
        id: String(p._id),
        name: p.name,
        type: p.type,
        isActive: !!p.isActive
      }))
    );
  }

  // opcional: activar/desactivar producto base
  if (req.method === "PUT") {
    const { id, isActive } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });
    await Product.updateOne({ _id: id }, { $set: { isActive: !!isActive } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
