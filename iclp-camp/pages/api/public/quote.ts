import type { NextApiRequest, NextApiResponse } from "next";
import { computeTotalARS } from "@/lib/pricing";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

type CartItem = { variantId: string; qty: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { step1, attendees, cart } = req.body || {};
  if (!step1 || !Array.isArray(attendees)) return res.status(400).json({ error: "Invalid payload" });

  const base = computeTotalARS(step1, attendees);
  const cartItems: CartItem[] = Array.isArray(cart) ? cart : [];

  await connectDB();

  const products = await Product.find({}).lean();
  const prodById = new Map(products.map((p: any) => [String(p._id), p]));

  let extrasTotal = 0;
  const extrasLines: any[] = [];
  const errors: string[] = [];

  for (const item of cartItems) {
    const qty = Math.max(0, Number(item?.qty || 0));
    if (!item?.variantId || qty <= 0) continue;

    const v = await ProductVariant.findById(item.variantId).lean();
    if (!v || !v.isActive) {
      errors.push("Una variante seleccionada ya no está disponible.");
      continue;
    }

    const stock = Number(v.stock || 0);
    if (qty > stock) {
      errors.push(`${v.sku}: stock insuficiente.`);
      continue;
    }

    const p = prodById.get(String(v.productId));
    const name = p?.name || "Producto";

    const unitPrice = Number(v.priceBundle || 0);
    const line = unitPrice * qty;

    extrasTotal += line;
    extrasLines.push({
      variantId: String(v._id),
      sku: v.sku,
      name,
      attributes: v.attributes,
      photoUrl: v.photoUrl || "",
      qty,
      unitPrice,
      lineTotal: line,
      stock
    });
  }

  const totalFinal = base.total + extrasTotal;

  res.status(200).json({
    ...base,
    extrasTotal,
    extrasLines,
    totalFinal,
    errors
  });
}
