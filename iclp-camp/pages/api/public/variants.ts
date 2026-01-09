import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  await connectDB();

  const products = await Product.find({ isActive: true }).lean();
  const prodById = new Map(products.map((p: any) => [String(p._id), p]));

  const variants = await ProductVariant.find({ isActive: true })
    .sort({ "attributes.design": 1, "attributes.color": 1, "attributes.size": 1 })
    .lean();

  const out = variants
    .map((v: any) => {
      const p = prodById.get(String(v.productId));
      if (!p) return null;

      return {
        variantId: String(v._id),
        productId: String(v.productId),
        productType: p.type,
        productName: p.name,
        sku: v.sku,
        attributes: v.attributes,
        photoUrl: v.photoUrl || "",
        stock: Number(v.stock || 0),
        priceBundle: Number(v.priceBundle || 0),
        priceStandalone: Number(v.priceStandalone || 0)
      };
    })
    .filter(Boolean);

  res.status(200).json(out);
}
