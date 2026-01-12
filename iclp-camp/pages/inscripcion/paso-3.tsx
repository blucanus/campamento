import Layout from "@/components/Layout";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Variant = {
  variantId: string;
  productType: "tee" | "cap";
  productName: string;
  sku: string;
  attributes: { design: string; color: string; size?: string };
  photoUrl: string;
  stock: number;
  priceBundle: number;
};

type CartItem = { variantId: string; qty: number };

/**
 * Google Drive muchas veces no sirve directo para <img>.
 * Esto transforma links comunes en un link directo (uc?export=view&id=...).
 */
function normalizeDriveUrl(url: string) {
  if (!url) return url;

  // Caso 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const m1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m1?.[1]) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;

  // Caso 2: https://drive.google.com/open?id=FILE_ID  ó  ...?id=FILE_ID
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (url.includes("drive.google.com") && m2?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
  }

  return url;
}

export default function Paso3() {
  const [step1, setStep1] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loadingPay, setLoadingPay] = useState(false);

  // modal imagen
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  // selectors
  const [selType, setSelType] = useState<"tee" | "cap">("tee");
  const [selDesign, setSelDesign] = useState("");
  const [selColor, setSelColor] = useState("");
  const [selSize, setSelSize] = useState("M");

  useEffect(() => {
    const s1 = JSON.parse(localStorage.getItem("step1") || "null");
    const s2 = JSON.parse(localStorage.getItem("step2") || "[]");
    const c = JSON.parse(localStorage.getItem("cart") || "{}");
    setStep1(s1);
    setAttendees(s2);
    setCart(c || {});
  }, []);

  useEffect(() => {
    fetch("/api/public/variants")
      .then(r => r.json())
      .then((data) => {
        setVariants(data || []);

        // set defaults
        const first = (data || [])[0];
        if (first) {
          setSelType(first.productType);
          setSelDesign(first.attributes?.design || "");
          setSelColor(first.attributes?.color || "");
          setSelSize(first.attributes?.size || "M");
        }
      })
      .catch(() => setVariants([]));
  }, []);

  const cartArr: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, qty]) => ({ variantId, qty }));
  }, [cart]);

  // persist cart
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // quote server-side
  useEffect(() => {
    if (!step1) return;
    fetch("/api/public/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step1, attendees, cart: cartArr })
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "No se pudo calcular el total");
        return j;
      })
      .then(setPricing)
      .catch(() => setPricing(null));
  }, [step1, attendees, cartArr]);

  const filtered = useMemo(() => {
    return variants.filter(v => v.productType === selType);
  }, [variants, selType]);

  const designs = useMemo(() => {
    return Array.from(new Set(filtered.map(v => v.attributes.design))).sort();
  }, [filtered]);

  const colors = useMemo(() => {
    return Array.from(
      new Set(filtered.filter(v => v.attributes.design === selDesign).map(v => v.attributes.color))
    ).sort();
  }, [filtered, selDesign]);

  const sizes = useMemo(() => {
    if (selType !== "tee") return [];
    return Array.from(
      new Set(
        filtered
          .filter(v => v.attributes.design === selDesign && v.attributes.color === selColor)
          .map(v => v.attributes.size || "")
      )
    ).filter(Boolean).sort();
  }, [filtered, selDesign, selColor, selType]);

  const selectedVariant = useMemo(() => {
    return filtered.find(v => {
      if (v.attributes.design !== selDesign) return false;
      if (v.attributes.color !== selColor) return false;
      if (selType === "tee") return (v.attributes.size || "") === selSize;
      return true;
    });
  }, [filtered, selDesign, selColor, selSize, selType]);

  function addOne() {
    if (!selectedVariant) return alert("Seleccioná una variante");
    const id = selectedVariant.variantId;
    const current = cart[id] || 0;
    const max = selectedVariant.stock;
    if (current + 1 > max) return alert("No hay más stock de esta variante");
    setCart(prev => ({ ...prev, [id]: current + 1 }));
  }

  function removeOne() {
    if (!selectedVariant) return;
    const id = selectedVariant.variantId;
    const current = cart[id] || 0;
    setCart(prev => ({ ...prev, [id]: Math.max(0, current - 1) }));
  }

  function setQty(id: string, qty: number, stock: number) {
    const q = Math.max(0, Math.min(stock, qty));
    setCart(prev => ({ ...prev, [id]: q }));
  }

  async function pagar() {
    if (!step1) return;

    setLoadingPay(true);
    try {
      const existingRegId = localStorage.getItem("regId") || "";

      const r = await fetch("/api/public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step1, attendees, regId: existingRegId, cart: cartArr })
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        alert(j.error || "Error al iniciar el pago");
        setLoadingPay(false);
        return;
      }

      if (j.regId) localStorage.setItem("regId", j.regId);

      if (j.alreadyPaid) {
        alert("Esta inscripción ya figura como pagada.");
        setLoadingPay(false);
        return;
      }

      if (!j.init_point) {
        alert("No se recibió link de pago (init_point).");
        setLoadingPay(false);
        return;
      }

      window.location.href = j.init_point;
    } catch {
      alert("Error de red/servidor");
      setLoadingPay(false);
    }
  }

  if (!step1) {
    return (
      <Layout title="Confirmar inscripción">
        <div className="card">
          <div className="alert">No se encontraron datos del Paso 1.</div>
          <Link className="btn" href="/inscripcion/paso-1">Ir a Paso 1</Link>
        </div>
      </Layout>
    );
  }

  const imgUrl = selectedVariant?.photoUrl ? normalizeDriveUrl(selectedVariant.photoUrl) : "";

  return (
    <Layout title="Confirmar inscripción">
      <div className="card">
        <h2>Confirmar inscripción</h2>

        <p>
          <b>Principal:</b> {step1.primaryFirstName} {step1.primaryLastName} – {step1.email}
        </p>

        {/* EXTRAS */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Sumar productos (precio preferencial)</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label>
              Producto
              <select
                value={selType}
                onChange={(e) => {
                  const t = e.target.value as any;
                  setSelType(t);
                  setSelDesign("");
                  setSelColor("");
                }}
              >
                <option value="tee">Remeras</option>
                <option value="cap">Gorras</option>
              </select>
            </label>

            <label>
              Diseño
              <select value={selDesign} onChange={(e) => setSelDesign(e.target.value)}>
                <option value="" disabled>Seleccionar</option>
                {designs.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>

            <label>
              Color
              <select value={selColor} onChange={(e) => setSelColor(e.target.value)}>
                <option value="" disabled>Seleccionar</option>
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {selType === "tee" ? (
              <label>
                Talle
                <select value={selSize} onChange={(e) => setSelSize(e.target.value)}>
                  {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            {imgUrl ? (
              <button
                type="button"
                onClick={() => setModalUrl(imgUrl)}
                style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
                aria-label="Ver imagen"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt="foto"
                  style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10 }}
                />
              </button>
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: 10, background: "rgba(15,118,110,0.08)" }} />
            )}

            <div>
              <div><b>{selectedVariant ? selectedVariant.sku : "Seleccioná una variante"}</b></div>
              <div style={{ opacity: 0.8 }}>
                Stock: {selectedVariant ? selectedVariant.stock : "-"} — Precio:{" "}
                ${selectedVariant ? Number(selectedVariant.priceBundle).toLocaleString("es-AR") : "-"}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn secondary" type="button" onClick={removeOne} disabled={!selectedVariant}>-</button>
                <button className="btn" type="button" onClick={addOne} disabled={!selectedVariant}>Agregar</button>
              </div>
            </div>
          </div>

          {/* Carrito */}
          <div style={{ marginTop: 12 }}>
            <h4>Tu carrito</h4>

            {pricing?.extrasLines?.length ? (
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Variante</th>
                    <th>Precio</th>
                    <th>Cant.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.extrasLines.map((x: any) => {
                    const label =
                      `${x.attributes?.design || ""} - ${x.attributes?.color || ""}` +
                      (x.attributes?.size ? ` - ${x.attributes.size}` : "");
                    return (
                      <tr key={x.variantId}>
                        <td>{x.name}</td>
                        <td>{label}</td>
                        <td>${Number(x.unitPrice).toLocaleString("es-AR")}</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={x.stock}
                            value={x.qty}
                            onChange={(e) => setQty(x.variantId, Number(e.target.value), x.stock)}
                            style={{ width: 90 }}
                          />
                        </td>
                        <td>${Number(x.lineTotal).toLocaleString("es-AR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ opacity: 0.8 }}>No agregaste productos.</p>
            )}

            {pricing?.errors?.length ? (
              <div className="alert" style={{ marginTop: 10 }}>
                {pricing.errors.map((e: string, i: number) => <div key={i}>• {e}</div>)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Resumen */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Resumen de pago</h3>

          {!pricing ? (
            <p style={{ opacity: 0.8 }}>Calculando...</p>
          ) : (
            <>
              <p><b>Personas que pagan (≥ 4 años):</b> {pricing.payingPeople}</p>
              <p><b>Precio por persona:</b> ${Number(pricing.pricePerPerson).toLocaleString("es-AR")}</p>
              <p><b>Extras:</b> ${Number(pricing.extrasTotal).toLocaleString("es-AR")}</p>
              <p>
                <b>Total:</b>{" "}
                <span style={{ fontSize: 18 }}>${Number(pricing.totalFinal).toLocaleString("es-AR")}</span>
              </p>
              <small>* Menores de 4 años no abonan. 1 día = 50%. 2 días o campa completo = total.</small>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={pagar} disabled={loadingPay}>
            {loadingPay ? "Procesando..." : "Confirmar y pagar"}
          </button>
          <Link className="btn secondary" href="/inscripcion/paso-2">Volver</Link>
        </div>
      </div>

      {/* MODAL IMAGEN */}
      {modalUrl ? (
        <div
          onClick={() => setModalUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 100%)",
              background: "#fff",
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Vista previa</b>
              <button className="btn secondary" type="button" onClick={() => setModalUrl(null)}>
                Cerrar
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalUrl}
              alt="Producto"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>
      ) : null}
    </Layout>
  );
}