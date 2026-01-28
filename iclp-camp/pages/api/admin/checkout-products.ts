import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { createPreference } from "@/lib/mercadopago";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

type CartItem = { variantId: string; qty: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  if (req.method !== "POST") return res.status(405).end();

  try {
    const { cart, payer_email } = req.body || {};
    const payerEmail = String(payer_email || "").trim().toLowerCase();
    if (!payerEmail) return res.status(400).json({ error: "Ingresá un email para el pagador" });

    const cartItems: CartItem[] = Array.isArray(cart) ? cart : [];
    const clean = cartItems
      .map((x) => ({
        variantId: String(x?.variantId || ""),
        qty: Math.max(0, Number(x?.qty || 0)),
      }))
      .filter((x) => x.variantId && x.qty > 0);

    if (clean.length === 0) return res.status(400).json({ error: "Carrito vacío" });

    await connectDB();

    // Solo por si querés validar nombres (no es obligatorio para total)
    const products = await Product.find({}).lean();
    const prodById = new Map(products.map((p: any) => [String(p._id), p]));

    let totalARS = 0;

    for (const item of clean) {
      const v: any = await ProductVariant.findById(item.variantId).lean();
      if (!v || !v.isActive) return res.status(400).json({ error: "Variante no disponible" });

      const stock = Number(v.stock || 0);
      if (item.qty > stock) return res.status(400).json({ error: `Stock insuficiente (${v.sku})` });

      const unit = Number(v.priceStandalone || 0);
      if (!Number.isFinite(unit) || unit < 0) {
        return res.status(400).json({ error: `Precio inválido (${v.sku})` });
      }

      // (opcional) valida que el producto exista
      const p = prodById.get(String(v.productId));
      if (!p) return res.status(400).json({ error: `Producto inválido para variante (${v.sku})` });

      totalARS += unit * item.qty;
    }

    if (!Number.isFinite(totalARS) || totalARS <= 0) {
      return res.status(400).json({ error: "Total inválido" });
    }

    const pref = await createPreference({
      // ✅ 1 solo item total (opción A)
      title: "Compra de productos (Admin)",
      quantity: 1,
      unit_price: totalARS,

      external_reference: `admin-products-${Date.now()}`,
      payer_email: payerEmail,
      notification_url: env.MP_NOTIFICATION_URL,
      back_urls: {
        success: `${env.APP_URL}/mp/success`,
        pending: `${env.APP_URL}/mp/pending`,
        failure: `${env.APP_URL}/mp/failure`,
      },
      auto_return: "approved",
    });

    // ✅ si el token es TEST, MP suele devolver sandbox_init_point
    // y ese es el que hay que usar. Si es PROD, usá init_point.
    const initPoint =
      env.MP_ACCESS_TOKEN.startsWith("TEST-")
        ? (pref.sandbox_init_point || pref.init_point)
        : pref.init_point;

    return res.status(200).json({
      ok: true,
      init_point: initPoint,
      totalARS,
      mode: env.MP_ACCESS_TOKEN.startsWith("TEST-") ? "sandbox" : "prod",
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Error creando pago" });
  }
}