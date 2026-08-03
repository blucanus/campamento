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

// ---- Point (posnet) ----
// Requiere un Point Smart vinculado a la misma cuenta y en modo PDV.

export type PointDevice = { id: string; operating_mode?: string; pos_id?: number };

async function mpPoint(path: string, init?: RequestInit) {
  const r = await fetch(`https://api.mercadopago.com/point/integration-api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      ...(init?.headers || {})
    }
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`MP Point ${path}: ${text || r.status}`);
  return text ? JSON.parse(text) : {};
}

export async function listPointDevices(): Promise<PointDevice[]> {
  const j = await mpPoint("/devices?limit=50");
  return Array.isArray(j?.devices) ? j.devices : [];
}

/** Manda el cobro al posnet. El monto va en centavos. */
export async function createPointPaymentIntent(params: {
  deviceId: string;
  amountARS: number;
  externalReference: string;
  description?: string;
}) {
  return mpPoint(`/devices/${encodeURIComponent(params.deviceId)}/payment-intents`, {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(params.amountARS * 100),
      description: params.description || "Campamento ICLP",
      additional_info: {
        external_reference: params.externalReference,
        print_on_terminal: true
      }
    })
  }) as Promise<{ id: string; state?: string }>;
}
