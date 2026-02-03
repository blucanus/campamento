import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MerchOrder } from "@/models/MerchOrder";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  await connectDB();

  const { orderId, delivered } = req.body || {};
  if (!orderId) return res.status(400).json({ error: "Missing orderId" });

  const order: any = await MerchOrder.findById(orderId);
  if (!order) return res.status(404).json({ error: "Not found" });

  const next = !!delivered;
  order.delivered = next;
  order.deliveredAt = next ? new Date() : null;
  order.deliveredBy = next ? (admin?.email || admin?.user || admin?.id || "admin") : "";
  await order.save();

  return res.status(200).json({
    delivered: order.delivered,
    deliveredAt: order.deliveredAt,
    deliveredBy: order.deliveredBy
  });
}
