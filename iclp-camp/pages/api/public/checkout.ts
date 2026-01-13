import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { computeTotalARS } from "@/lib/pricing";
import { createPreference } from "@/lib/mercadopago";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { Registration } from "@/models/Registration";

type CartItem = { variantId: string; qty: number };

function normalizePrimary(step1: any) {
  const first = String(step1?.primaryFirstName || step1?.firstName || "").trim();
  const last = String(step1?.primaryLastName || step1?.lastName || "").trim();

  const email = String(step1?.email || step1?.mail || "").trim();

  const phone =
    String(
      step1?.phone ||
      step1?.tel ||
      step1?.telefono ||
      step1?.phoneNumber ||
      ""
    ).trim();

  return {
    name: `${first} ${last}`.trim() || "-",
    email: email || "",
    phone: phone || ""
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { step1, attendees, regId, cart } = req.body || {};
  if (!step1 || !Array.isArray(attendees)) return res.status(400).json({ error: "Invalid payload" });

  const primary = normalizePrimary(step1);
  if (!primary.email) return res.status(400).json({ error: "Email requerido" });

  await connectDB();

  // Buscar o crear inscripción
  let doc: any = null;

  if (regId) {
    doc = await Registration.findById(regId);
  }

  if (!doc) {
    doc = await Registration.create({
      step1,
      primary, // ✅ guardar primary al crear
      attendees,
      extras: [],
      payment: { status: "pending" }
    });
  } else {
    // actualizar datos si volvieron a intentar
    doc.step1 = step1;
    doc.primary = primary; // ✅ normalizado
    doc.attendees = attendees;
  }

  if (doc.payment?.status === "approved") {
    await doc.save();
    return res.status(200).json({ regId: String(doc._id), alreadyPaid: true });
  }

  // Si ya tiene init_point guardado, lo reusamos
  if (doc.payment?.initPoint) {
    await doc.save();
    return res.status(200).json({ regId: String(doc._id), init_point: doc.payment.initPoint });
  }

  // ✅ pricing base con descuento por 5to+
  const base = computeTotalARS(step1, attendees);
  const campTotal = Number((base as any).campTotal ?? (base as any).total ?? 0);

  // extras
  const cartItems: CartItem[] = Array.isArray(cart) ? cart : [];

  const products = await Product.find({}).lean();
  const prodById = new Map(products.map((p: any) => [String(p._id), p]));

  const extras: any[] = [];
  const mpExtras: { title: string; quantity: number; unit_price: number; currency_id: "ARS" }[] = [];

  for (const item of cartItems) {
    const qty = Math.max(0, Number(item?.qty || 0));
    if (!item?.variantId || qty <= 0) continue;

    const v: any = await ProductVariant.findById(item.variantId);
    if (!v || !v.isActive) return res.status(400).json({ error: "Variante no disponible" });

    const stock = Number(v.stock || 0);
    if (qty > stock) return res.status(400).json({ error: `Stock insuficiente (${v.sku})` });

    const p = prodById.get(String(v.productId));
    const name = p?.name || "Producto";

    const unitPrice = Number(v.priceBundle || 0);

    extras.push({
      variantId: String(v._id),
      sku: v.sku,
      name,
      attributes: v.attributes,
      qty,
      unitPrice
    });

    const label =
      name +
      ` (${v.attributes?.design || ""} ${v.attributes?.color || ""}` +
      (v.attributes?.size ? ` ${v.attributes.size}` : "") +
      ")";

    mpExtras.push({
      title: label.trim(),
      quantity: qty,
      unit_price: unitPrice,
      currency_id: "ARS"
    });
  }

  doc.extras = extras;

  // ✅ Opción A: un solo item total para el campa (ya incluye el descuento familiar)
  const items = [
    {
      title: "Inscripción Campamento ICLP",
      quantity: 1,
      unit_price: campTotal,
      currency_id: "ARS" as const
    },
    ...mpExtras
  ];

  const pref = await createPreference({
    items,
    external_reference: String(doc._id),
    payer_email: primary.email,
    notification_url: env.MP_NOTIFICATION_URL,
    back_urls: {
      success: `${env.APP_URL}/mp/success`,
      pending: `${env.APP_URL}/mp/pending`,
      failure: `${env.APP_URL}/mp/failure`
    }
  });

  const initPoint =
    env.MP_ACCESS_TOKEN.startsWith("TEST-")
      ? ((pref as any).sandbox_init_point || pref.init_point)
      : pref.init_point;

  doc.payment.preferenceId = pref.id;
  doc.payment.initPoint = initPoint;
  doc.payment.status = "pending";
  await doc.save();

  return res.status(200).json({ regId: String(doc._id), init_point: initPoint });
}
