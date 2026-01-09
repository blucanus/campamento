import { env } from "@/lib/env";

type MPItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: "ARS";
};

type PreferenceCommon = {
  external_reference: string;
  payer_email: string;
  notification_url: string;
  back_urls: { success: string; pending: string; failure: string };
  auto_return?: "approved";
};

// ✅ NUEVO (multi-items)
type CreatePreferenceMulti = PreferenceCommon & {
  items: MPItem[];
};

// ✅ VIEJO (single item) — lo dejamos para no romper código existente
type CreatePreferenceSingle = PreferenceCommon & {
  title: string;
  quantity: number;
  unit_price: number;
};

export async function createPreference(params: CreatePreferenceMulti | CreatePreferenceSingle) {
  const items: MPItem[] =
    "items" in params
      ? params.items
      : [
          {
            title: params.title,
            quantity: params.quantity,
            unit_price: params.unit_price,
            currency_id: "ARS"
          }
        ];

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      items,
      external_reference: params.external_reference,
      payer: { email: params.payer_email },
      notification_url: params.notification_url,
      back_urls: params.back_urls,
      auto_return: params.auto_return ?? "approved"
    })
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error("MP preference error: " + t);
  }

  return r.json() as Promise<{ id: string; init_point: string; sandbox_init_point?: string }>;
}
