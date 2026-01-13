import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

function makeSku(pType: string, design: string, color: string, size?: string) {
  const d = String(design || "").trim().toUpperCase().replace(/\s+/g, "-");
  const c = String(color || "").trim().toUpperCase().replace(/\s+/g, "-");
  const s = String(size || "").trim().toUpperCase().replace(/\s+/g, "-");
  if (!d || !c) return "";
  return pType === "tee" ? `TEE-${d}-${c}-${s || "NA"}` : `CAP-${d}-${c}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  if (req.method === "GET") {
    const variants = await ProductVariant.find({}).sort({ createdAt: -1 }).lean();
    const products = await Product.find({}).lean();
    const prodById = new Map(products.map((p: any) => [String(p._id), p]));

    return res.status(200).json(
      variants.map((v: any) => {
        const p = prodById.get(String(v.productId));
        return {
          id: String(v._id),
          productId: String(v.productId),
          productType: p?.type,
          productName: p?.name,
          sku: v.sku,
          attributes: v.attributes,
          photoUrl: v.photoUrl || "",
          stock: Number(v.stock || 0),
          priceBundle: Number(v.priceBundle || 0),
          priceStandalone: Number(v.priceStandalone || 0),
          isActive: !!v.isActive
        };
      })
    );
  }

  // Crear variante (upsert por SKU)
  if (req.method === "POST") {
    const { productId, design, color, size, photoUrl, stock, priceBundle, priceStandalone } = req.body || {};

    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ error: "Falta productId" });
    }

    // evita CastError si llega cualquier texto
    if (!/^[a-fA-F0-9]{24}$/.test(productId)) {
      return res.status(400).json({ error: "Producto inválido (productId no es ObjectId)" });
    }


    const p = await Product.findById(productId);
    if (!p) return res.status(400).json({ error: "Producto inválido" });

    const sku = makeSku(p.type, design, color, p.type === "tee" ? size : "");
    if (!sku) return res.status(400).json({ error: "SKU inválido (revisá diseño/color/talle)" });

    const doc = await ProductVariant.findOneAndUpdate(
      { sku },
      {
        $set: {
          productId,
          sku,
          attributes: {
            design: String(design || "").trim(),
            color: String(color || "").trim(),
            size: p.type === "tee" ? String(size || "").trim().toUpperCase() : ""
          },
          photoUrl: String(photoUrl || "").trim(),
          stock: Number(stock || 0),
          priceBundle: Number(priceBundle || 0),
          priceStandalone: Number(priceStandalone || 0),
          isActive: true
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ ok: true, id: String(doc._id), sku: doc.sku });
  }

  // Editar variante (no cambia SKU ni atributos)
  if (req.method === "PUT") {
    const { id, photoUrl, stock, priceBundle, priceStandalone, isActive } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });

    await ProductVariant.updateOne(
      { _id: id },
      {
        $set: {
          photoUrl: String(photoUrl ?? "").trim(),
          stock: Number(stock ?? 0),
          priceBundle: Number(priceBundle ?? 0),
          priceStandalone: Number(priceStandalone ?? 0),
          isActive: !!isActive
        }
      }
    );

    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });

    await ProductVariant.deleteOne({ _id: id });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
