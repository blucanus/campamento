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

// ---- QR interoperable (Mercado Pago, Cuenta DNI, MODO, etc.) ----

async function mpApi(path: string, init?: RequestInit) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      ...(init?.headers || {})
    }
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`MP ${path}: ${text || r.status}`);
  return text ? JSON.parse(text) : {};
}

export async function getCollectorId(): Promise<string> {
  const me = await mpApi("/users/me");
  return String(me?.id || "");
}

// Como figura la sucursal/caja dentro de Mercado Pago.
const QR_STORE_NAME = "Campamento";

// Domicilio de la sucursal (lo pide MP). Es la iglesia, no el predio del campa.
const QR_STORE_LOCATION = {
  street_number: "1",
  street_name: "Iglesia",
  city_name: "La Plata",
  state_name: "Buenos Aires",
  latitude: -34.921453,
  longitude: -57.954531
};

/**
 * Busca la sucursal de la web y, si no existe, la crea.
 * Mercado Pago no deja crear una caja suelta: tiene que colgar de una sucursal.
 */
export async function getOrCreateQrStore(collectorId: string, externalId: string) {
  const base = `/users/${encodeURIComponent(collectorId)}/stores`;

  const found = await mpApi(`${base}/search?external_id=${encodeURIComponent(externalId)}`);
  const list = found?.results;
  if (Array.isArray(list) && list.length) return list[0];

  return mpApi(base, {
    method: "POST",
    body: JSON.stringify({
      name: QR_STORE_NAME,
      external_id: externalId,
      location: QR_STORE_LOCATION
    })
  });
}

/** Busca la caja (POS) de la web y, si no existe, la crea dentro de la sucursal. */
export async function getOrCreateQrPos(externalId: string, storeId: string) {
  const found = await mpApi(`/pos?external_id=${encodeURIComponent(externalId)}`);
  const list = found?.results;
  if (Array.isArray(list) && list.length) return list[0];

  return mpApi("/pos", {
    method: "POST",
    body: JSON.stringify({
      name: QR_STORE_NAME,
      fixed_amount: true,
      external_id: externalId,
      store_id: storeId
    })
  });
}

/** Genera el QR dinamico con el monto exacto de esa inscripcion. */
export async function createQrOrder(params: {
  collectorId: string;
  externalPosId: string;
  externalReference: string;
  title: string;
  totalAmount: number;
  notificationUrl: string;
}) {
  const path =
    `/instore/orders/qr/seller/collectors/${encodeURIComponent(params.collectorId)}` +
    `/pos/${encodeURIComponent(params.externalPosId)}/qrs`;

  return mpApi(path, {
    method: "PUT",
    body: JSON.stringify({
      external_reference: params.externalReference,
      title: params.title,
      description: params.title,
      notification_url: params.notificationUrl,
      total_amount: params.totalAmount,
      items: [
        {
          title: params.title,
          unit_price: params.totalAmount,
          quantity: 1,
          unit_measure: "unit",
          total_amount: params.totalAmount
        }
      ]
    })
  }) as Promise<{ qr_data?: string; in_store_order_id?: string }>;
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

/** El posnet tiene que estar en modo PDV para aceptar cobros de la integracion. */
export async function setPointOperatingMode(deviceId: string, mode: "PDV" | "STANDALONE") {
  return mpPoint(`/devices/${encodeURIComponent(deviceId)}`, {
    method: "PATCH",
    body: JSON.stringify({ operating_mode: mode })
  }) as Promise<PointDevice>;
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
