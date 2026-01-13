import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  const products = await Product.find({}).sort({ createdAt: -1 }).lean();
  const variants = await ProductVariant.find({}).lean();

  const byProduct = new Map<string, any[]>();
  for (const v of variants as any[]) {
    const pid = String(v.productId);
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    byProduct.get(pid)!.push(v);
  }

  const out = (products as any[]).map((p) => {
    const pid = String(p._id);
    const list = byProduct.get(pid) || [];
    const stockTotal = list.reduce((acc, v) => acc + Number(v.stock || 0), 0);
    const activeCount = list.filter((v) => v.isActive).length;

    return {
      // ✅ compat con tu frontend
      id: pid,

      // si querés, lo dejamos también (no molesta)
      _id: pid,

      name: p.name,
      type: p.type,
      isActive: !!p.isActive,

      variantsCount: list.length,
      activeCount,
      stockTotal
    };
  });

  return res.status(200).json(out);
}
