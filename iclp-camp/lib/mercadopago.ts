import { env } from "@/lib/env";

export async function createPreference(params: {
  title: string;
  quantity: number;
  unit_price: number;
  external_reference: string;
  payer_email: string;
  notification_url: string;
  back_urls: { success: string; pending: string; failure: string };
}) {
  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      items: [
        { title: params.title, quantity: params.quantity, unit_price: params.unit_price, currency_id: "ARS" }
      ],
      external_reference: params.external_reference,
      payer: { email: params.payer_email },
      notification_url: params.notification_url,
      back_urls: params.back_urls,
      auto_return: "approved"
    })
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error("MP preference error: " + t);
  }
  return r.json() as Promise<{ id: string; init_point: string; sandbox_init_point?: string }>;
}
