import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { createPreference } from "@/lib/mercadopago";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { MerchOrder } from "@/models/MerchOrder";

type CartItem = { variantId: string; qty: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { cart, payer_email, payer_firstName, payer_lastName } = req.body || {};
    const payerEmail = String(payer_email || "").trim().toLowerCase();
    if (!payerEmail) return res.status(400).json({ error: "Email requerido" });
    const firstName = String(payer_firstName || "").trim();
    const lastName = String(payer_lastName || "").trim();
    if (!firstName || !lastName) return res.status(400).json({ error: "Nombre y apellido requeridos" });

    const cartItems: CartItem[] = Array.isArray(cart) ? cart : [];
    const clean = cartItems
      .map((x) => ({
        variantId: String(x?.variantId || ""),
        qty: Math.max(0, Number(x?.qty || 0)),
      }))
      .filter((x) => x.variantId && x.qty > 0);

    if (clean.length === 0) return res.status(400).json({ error: "Carrito vacío" });

    await connectDB();

    // (opcional) para validar que existan products
    const products = await Product.find({}).lean();
    const prodById = new Map(products.map((p: any) => [String(p._id), p]));

    let totalARS = 0;
    const items: any[] = [];

    for (const item of clean) {
      const v: any = await ProductVariant.findById(item.variantId).lean();
      if (!v || !v.isActive) return res.status(400).json({ error: "Variante no disponible" });

      const stock = Number(v.stock || 0);
      if (item.qty > stock) return res.status(400).json({ error: `Stock insuficiente (${v.sku})` });

      const p = prodById.get(String(v.productId));
      if (!p) return res.status(400).json({ error: `Producto inválido para variante (${v.sku})` });

      const unit = Number(v.priceStandalone || 0);
      if (!Number.isFinite(unit) || unit < 0) return res.status(400).json({ error: `Precio inválido (${v.sku})` });

      totalARS += unit * item.qty;

      items.push({
        variantId: String(v._id),
        sku: v.sku,
        name: p?.name || "Producto",
        attributes: v.attributes,
        qty: item.qty,
        unitPrice: unit
      });
    }

    if (!Number.isFinite(totalARS) || totalARS <= 0) {
      return res.status(400).json({ error: "Total inválido" });
    }

    const order = await MerchOrder.create({
      buyer: { firstName, lastName, email: payerEmail },
      items,
      totalARS,
      delivered: false,
      payment: { status: "pending" }
    });

    const externalReference = `merch-${String(order._id)}`;

    const pref = await createPreference({
      title: "Merch Campamento ICLP",
      quantity: 1,
      unit_price: totalARS,

      external_reference: externalReference,
      payer_email: payerEmail,
      notification_url: env.MP_NOTIFICATION_URL,
      back_urls: {
        success: `${env.APP_URL}/mp/success`,
        pending: `${env.APP_URL}/mp/pending`,
        failure: `${env.APP_URL}/mp/failure`,
      },
      auto_return: "approved",
    });

    const initPoint =
      env.MP_ACCESS_TOKEN.startsWith("TEST-")
        ? (pref.sandbox_init_point || pref.init_point)
        : pref.init_point;

    order.externalReference = externalReference;
    order.payment.preferenceId = pref.id;
    order.payment.initPoint = initPoint;
    await order.save();

    return res.status(200).json({ ok: true, init_point: initPoint, totalARS });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Error creando pago" });
  }
}
