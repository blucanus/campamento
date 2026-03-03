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

function toErrorMessage(raw: unknown): string {
  if (!raw) return "Unknown error";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const parts = [
      typeof o.message === "string" ? o.message : "",
      typeof o.error === "string" ? o.error : "",
      typeof o.cause === "string" ? o.cause : ""
    ].filter(Boolean);
    if (parts.length) return parts.join(" | ");
    try {
      return JSON.stringify(raw);
    } catch {
      return "Unknown object error";
    }
  }
  return String(raw);
}

async function parseMpError(r: Response): Promise<string> {
  const txt = await r.text().catch(() => "");
  if (!txt) return `HTTP ${r.status}`;
  try {
    return toErrorMessage(JSON.parse(txt));
  } catch {
    return txt;
  }
}

async function fetchPaymentById(paymentId: string): Promise<PaymentData | null> {
  const id = String(paymentId || "").trim();
  if (!id) return null;

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` }
  });
  if (!r.ok) {
    const msg = await parseMpError(r);
    throw new Error(`Mercado Pago /payments/${id}: ${msg}`);
  }
  return r.json() as Promise<PaymentData>;
}

async function fetchPaymentsByReference(externalReference: string): Promise<PaymentData[]> {
  const ref = String(externalReference || "").trim();
  if (!ref) return [];

  const qs = new URLSearchParams({
    external_reference: ref,
    sort: "date_last_updated",
    criteria: "desc",
    range: "date_created",
    begin_date: "NOW-365DAYS",
    end_date: "NOW",
    limit: "50"
  });

  const r = await fetch(`https://api.mercadopago.com/v1/payments/search?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` }
  });
  if (!r.ok) {
    const msg = await parseMpError(r);
    throw new Error(`Mercado Pago /payments/search: ${msg}`);
  }

  const j = (await r.json()) as SearchPaymentsResponse;
  return Array.isArray(j?.results) ? j.results : [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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

    let paymentById: PaymentData | null = null;
    if (previousPaymentId) {
      paymentById = await fetchPaymentById(previousPaymentId);
    }

    const byReference = await fetchPaymentsByReference(externalReference);
    const approvedByReference =
      byReference.find((p) => String(p?.status || "").toLowerCase() === "approved") || null;
    const latestByReference = byReference[0] || null;

    const payment = approvedByReference || paymentById || latestByReference;

    if (!payment) {
      return res.status(200).json({
        ok: true,
        changed: false,
        status: previousStatus,
        paymentId: previousPaymentId || null
      });
    }

    const nextStatus = String(payment.status || previousStatus || "pending");
    const nextPaymentId = String(payment.id || previousPaymentId || "").trim();
    const changed = nextStatus !== previousStatus || nextPaymentId !== previousPaymentId;

    doc.payment = doc.payment || {};
    doc.payment.status = nextStatus;
    doc.payment.paymentId = nextPaymentId || doc.payment.paymentId || "";
    doc.payment.lastEventAt = payment.date_last_updated
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
  } catch (e: unknown) {
    return res.status(502).json({
      error: "No se pudo sincronizar con Mercado Pago",
      details: toErrorMessage(e)
    });
  }
}
