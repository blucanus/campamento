import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { createPreference } from "@/lib/mercadopago";
import { env } from "@/lib/env";

type CartItem = { variantId: string; qty: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const { cart, payer_email } = req.body || {};
  const itemsCart: CartItem[] = Array.isArray(cart) ? cart : [];
  const email = String(payer_email || "").trim();
  if (!email) return res.status(400).json({ error: "payer_email requerido" });

  await connectDB();

  // Traer productos para nombre
  const products = await Product.find({}).lean();
  const prodById = new Map(products.map((p: any) => [String(p._id), p]));

  let total = 0;
  const mpItems: { title: string; quantity: number; unit_price: number; currency_id: "ARS" }[] = [];

  for (const c of itemsCart) {
    const qty = Math.max(0, Number(c?.qty || 0));
    if (!c?.variantId || qty <= 0) continue;

    const v = await ProductVariant.findById(c.variantId).lean();
    if (!v || !v.isActive) return res.status(400).json({ error: "Variante no disponible" });

    if (qty > Number(v.stock || 0)) {
      return res.status(400).json({ error: `Stock insuficiente para ${v.sku}` });
    }

    const p = prodById.get(String(v.productId));
    const name = p?.name || "Producto";

    const unit = Number(v.priceStandalone || 0);
    total += unit * qty;

    const title =
      name +
      ` (${v.attributes?.design || ""} ${v.attributes?.color || ""}` +
      (v.attributes?.size ? ` ${v.attributes.size}` : "") +
      ")";

    mpItems.push({ title, quantity: qty, unit_price: unit, currency_id: "ARS" });
  }

  if (mpItems.length === 0) return res.status(400).json({ error: "Carrito vacío" });

  const pref = await createPreference({
    items: mpItems,
    external_reference: `ADMIN_PRODUCTS_${Date.now()}`,
    payer_email: email,
    notification_url: env.MP_NOTIFICATION_URL,
    back_urls: {
      success: `${env.APP_URL}/admin/buy?status=success`,
      pending: `${env.APP_URL}/admin/buy?status=pending`,
      failure: `${env.APP_URL}/admin/buy?status=failure`
    }
  });

  return res.status(200).json({
    init_point: (pref as any).sandbox_init_point || pref.init_point,
    total
  });
}
