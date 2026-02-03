import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MerchOrder } from "@/models/MerchOrder";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  const q = String(req.query.q || "").trim().toLowerCase();

  const orders = await MerchOrder.find({})
    .sort({ createdAt: -1 })
    .lean();

  const normalized = orders.map((o: any) => {
    const buyerName = `${o.buyer?.firstName || ""} ${o.buyer?.lastName || ""}`.trim() || "-";
    const totalItems = Array.isArray(o.items)
      ? o.items.reduce((acc: number, it: any) => acc + Number(it.qty || 0), 0)
      : 0;

    return {
      ...o,
      buyer: {
        name: buyerName,
        email: o.buyer?.email || "-"
      },
      itemsCount: totalItems
    };
  });

  const filtered =
    !q
      ? normalized
      : normalized.filter((o: any) => {
          const hay = `${o.buyer?.name || ""} ${o.buyer?.email || ""}`.toLowerCase();
          if (hay.includes(q)) return true;

          const items = Array.isArray(o.items) ? o.items : [];
          return items.some((it: any) => {
            const s = `${it.name || ""} ${it.sku || ""}`.toLowerCase();
            return s.includes(q);
          });
        });

  return res.json(filtered);
}
