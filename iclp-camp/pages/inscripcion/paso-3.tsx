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

export default function Paso3() {
  const [step1, setStep1] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loadingPay, setLoadingPay] = useState(false);

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

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

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

  const filtered = useMemo(() => variants.filter(v => v.productType === selType), [variants, selType]);

  const designs = useMemo(() => Array.from(new Set(filtered.map(v => v.attributes.design))).sort(), [filtered]);

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

  const principal = `${step1.primaryFirstName} ${step1.primaryLastName}`.trim();

  return (
    <Layout title="Confirmar inscripción">
      <div className="wizard">
        <div className="wizardHead">
          <div>
            <h2 className="wizardTitle">Confirmar y pagar</h2>
            <p className="wizardSub">Paso 3 de 3 — Resumen final</p>
          </div>

          <div className="stepper">
            <div className="step isDone"><span className="stepDot" /> Paso 1</div>
            <div className="step isDone"><span className="stepDot" /> Paso 2</div>
            <div className="step isActive"><span className="stepDot" /> Resumen</div>
          </div>
        </div>

        <div className="summaryBox">
          {/* izquierda */}
          <div>
            <div className="card cardTight">
              <h3 style={{ marginTop: 0 }}>Datos principales</h3>
              <div className="summaryLine">
                <span>Familiar principal</span>
                <b>{principal}</b>
              </div>
              <div className="summaryLine">
                <span>Email</span>
                <b>{step1.email}</b>
              </div>
              <div className="summaryLine">
                <span>Personas</span>
                <b>{attendees.length}</b>
              </div>

              <div style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>
                * Te llega un mail cuando cargás la inscripción y otro cuando se confirma el pago.
              </div>
            </div>

            {/* EXTRAS */}
            <div className="card cardTight" style={{ marginTop: 12 }}>
              <h3 style={{ marginTop: 0 }}>Sumar productos (precio preferencial)</h3>

              <div className="formGrid">
                <div>
                  <label>Producto</label>
                  <select value={selType} onChange={(e) => {
                    const t = e.target.value as any;
                    setSelType(t);
                    setSelDesign("");
                    setSelColor("");
                  }}>
                    <option value="tee">Remeras</option>
                    <option value="cap">Gorras</option>
                  </select>
                </div>

                <div>
                  <label>Diseño</label>
                  <select value={selDesign} onChange={(e) => setSelDesign(e.target.value)}>
                    <option value="" disabled>Seleccionar</option>
                    {designs.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label>Color</label>
                  <select value={selColor} onChange={(e) => setSelColor(e.target.value)}>
                    <option value="" disabled>Seleccionar</option>
                    {colors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {selType === "tee" ? (
                  <div>
                    <label>Talle</label>
                    <select value={selSize} onChange={(e) => setSelSize(e.target.value)}>
                      {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                {selectedVariant?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedVariant.photoUrl} alt="foto" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 12 }} />
                ) : (
                  <div style={{ width: 92, height: 92, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(0,0,0,0.06)" }} />
                )}

                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="kpi">{selectedVariant ? selectedVariant.sku : "Seleccioná una variante"}</div>
                  <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>
                    Stock: {selectedVariant ? selectedVariant.stock : "-"} — Precio:{" "}
                    <b>${selectedVariant ? Number(selectedVariant.priceBundle).toLocaleString("es-AR") : "-"}</b>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="btn secondary" onClick={removeOne} disabled={!selectedVariant} type="button">-</button>
                    <button className="btn" onClick={addOne} disabled={!selectedVariant} type="button">Agregar</button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <h4 style={{ margin: 0 }}>Tu carrito</h4>

                {pricing?.extrasLines?.length ? (
                  <div className="tableWrap">
                    <table className="miniTable" style={{ marginTop: 10 }}>
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
                  </div>
                ) : (
                  <p style={{ opacity: 0.8, marginTop: 8 }}>No agregaste productos.</p>
                )}

                {pricing?.errors?.length ? (
                  <div className="alert" style={{ marginTop: 10 }}>
                    {pricing.errors.map((e: string, i: number) => <div key={i}>• {e}</div>)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* derecha */}
          <div>
            <div className="card cardTight">
              <h3 style={{ marginTop: 0 }}>Resumen de pago</h3>

              {!pricing ? (
                <p style={{ opacity: 0.8 }}>Calculando...</p>
              ) : (
                <>
                  <div className="summaryLine">
                    <span>Personas que pagan</span>
                    <b>{pricing.payingPeople}</b>
                  </div>
                  <div className="summaryLine">
                    <span>Precio por persona</span>
                    <b>${Number(pricing.pricePerPerson).toLocaleString("es-AR")}</b>
                  </div>
                  <div className="summaryLine">
                    <span>Extras</span>
                    <b>${Number(pricing.extrasTotal).toLocaleString("es-AR")}</b>
                  </div>

                  <div className="summaryLine" style={{ paddingTop: 14 }}>
                    <span className="kpi">Total</span>
                    <span className="kpiBig">
                      ${Number(pricing.totalFinal).toLocaleString("es-AR")}
                    </span>
                  </div>

                  <div className="fieldHint" style={{ marginTop: 10 }}>
                    * Menores de 4 años no abonan. 1 día = 50%. 2 días o campa completo = total.
                  </div>
                </>
              )}

              <div className="stickyBar" style={{ marginTop: 12 }}>
                <Link className="btn secondary" href="/inscripcion/paso-2">
                  ← Volver
                </Link>
                <button className="btn" onClick={pagar} disabled={loadingPay} type="button">
                  {loadingPay ? "Procesando..." : "Confirmar y pagar"}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
