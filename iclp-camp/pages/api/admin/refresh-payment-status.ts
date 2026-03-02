import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { Registration } from "@/models/Registration";
import { MerchOrder } from "@/models/MerchOrder";

type Kind = "registration" | "merch";
type PaymentData = {
  id?: string | number;
  status?: string;
  date_last_updated?: string;
};
type SearchPaymentsResponse = {
  results?: PaymentData[];
};
type PaymentDoc = {
  _id: unknown;
  externalReference?: string;
  payment?: {
    status?: string;
    paymentId?: string;
    lastEventAt?: Date | null;
  };
  save: () => Promise<unknown>;
};

async function fetchPaymentById(paymentId: string): Promise<PaymentData | null> {
  const id = String(paymentId || "").trim();
  if (!id) return null;

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` }
  });
  if (!r.ok) return null;
  return r.json() as Promise<PaymentData>;
}

async function fetchLatestPaymentByReference(externalReference: string): Promise<PaymentData | null> {
  const ref = String(externalReference || "").trim();
  if (!ref) return null;

  const qs = new URLSearchParams({
    external_reference: ref,
    sort: "date_created",
    criteria: "desc",
    limit: "1"
  });

  const r = await fetch(`https://api.mercadopago.com/v1/payments/search?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` }
  });
  if (!r.ok) return null;

  const j = (await r.json()) as SearchPaymentsResponse;
  const list = Array.isArray(j?.results) ? j.results : [];
  return list[0] || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  if (!env.MP_ACCESS_TOKEN) {
    return res.status(400).json({ error: "MP access token missing" });
  }

  const kind = String(req.body?.kind || "").trim() as Kind;
  const id = String(req.body?.id || "").trim();
  if (!id) return res.status(400).json({ error: "Missing id" });
  if (kind !== "registration" && kind !== "merch") {
    return res.status(400).json({ error: "Invalid kind" });
  }

  await connectDB();

  const doc =
    kind === "registration"
      ? ((await Registration.findById(id)) as PaymentDoc | null)
      : ((await MerchOrder.findById(id)) as PaymentDoc | null);

  if (!doc) return res.status(404).json({ error: "Not found" });

  const previousStatus = String(doc.payment?.status || "pending");
  const previousPaymentId = String(doc.payment?.paymentId || "").trim();
  const externalReference =
    kind === "registration"
      ? String(doc._id)
      : String(doc.externalReference || `merch-${doc._id}`);

  let payment: PaymentData | null = null;

  if (previousPaymentId) {
    payment = await fetchPaymentById(previousPaymentId);
  }

  if (!payment) {
    payment = await fetchLatestPaymentByReference(externalReference);
  }

  if (!payment) {
    return res.status(200).json({
      ok: true,
      changed: false,
      status: previousStatus,
      paymentId: previousPaymentId || null
    });
  }

  const nextStatus = String(payment?.status || previousStatus || "pending");
  const nextPaymentId = String(payment?.id || previousPaymentId || "").trim();
  const changed = nextStatus !== previousStatus || nextPaymentId !== previousPaymentId;

  doc.payment = doc.payment || {};
  doc.payment.status = nextStatus;
  doc.payment.paymentId = nextPaymentId || doc.payment.paymentId || "";
  doc.payment.lastEventAt = payment?.date_last_updated
    ? new Date(payment.date_last_updated)
    : new Date();
  await doc.save();

  return res.status(200).json({
    ok: true,
    changed,
    status: doc.payment.status,
    paymentId: doc.payment.paymentId || null,
    lastEventAt: doc.payment.lastEventAt || null
  });
}
