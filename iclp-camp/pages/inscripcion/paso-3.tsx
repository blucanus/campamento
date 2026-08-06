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

type Attendee = {
  firstName?: string;
  lastName?: string;
  dni?: string;
  age?: number;
  relation?: string;
  isPrimary?: boolean;
};

type Step1 = {
  count?: number;
  optionDays?: "full" | "1" | "2";
  oneDay?: string;
  twoDays?: string;
  primaryFirstName?: string;
  primaryLastName?: string;
  phone?: string;
  email?: string;
};

type ExtrasLine = {
  variantId: string;
  name: string;
  attributes?: { design?: string; color?: string; size?: string };
  unitPrice: number;
  qty: number;
  stock: number;
  lineTotal: number;
};

type Pricing = {
  payingPeople?: number;
  pricePerPerson?: number;
  normalCount?: number;
  discountedCount?: number;
  discountedPricePerPerson?: number;
  campTotal?: number;
  total?: number;
  extrasTotal?: number;
  totalFinal?: number;
  extrasLines?: ExtrasLine[];
  errors?: string[];
};

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

function diasTexto(s1: Step1) {
  if (s1.optionDays === "1") return `1 día (${s1.oneDay || "-"})`;
  if (s1.optionDays === "2") return `2 días (${String(s1.twoDays || "").replace("-", " y ")})`;
  return "Campamento completo";
}

export default function Paso3() {
  const [step1, setStep1] = useState<Step1 | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
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
      .then((r) => r.json())
      .then((data) => {
        setVariants(data || []);

        // defaults
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
      body: JSON.stringify({ step1, attendees, cart: cartArr }),
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
    return variants.filter((v) => v.productType === selType);
  }, [variants, selType]);

  const designs = useMemo(() => {
    return Array.from(new Set(filtered.map((v) => v.attributes.design))).sort();
  }, [filtered]);

  const colors = useMemo(() => {
    return Array.from(
      new Set(filtered.filter((v) => v.attributes.design === selDesign).map((v) => v.attributes.color))
    ).sort();
  }, [filtered, selDesign]);

  const sizes = useMemo(() => {
    if (selType !== "tee") return [];
    return Array.from(
      new Set(
        filtered
          .filter((v) => v.attributes.design === selDesign && v.attributes.color === selColor)
          .map((v) => v.attributes.size || "")
      )
    )
      .filter(Boolean)
      .sort();
  }, [filtered, selDesign, selColor, selType]);

  const selectedVariant = useMemo(() => {
    return filtered.find((v) => {
      if (v.attributes.design !== selDesign) return false;
      if (v.attributes.color !== selColor) return false;
      if (selType === "tee") return (v.attributes.size || "") === selSize;
      return true;
    });
  }, [filtered, selDesign, selColor, selSize, selType]);

  const hasVariants = variants.length > 0;

  function addOne() {
    if (!selectedVariant) return alert("Seleccioná una variante");
    const id = selectedVariant.variantId;
    const current = cart[id] || 0;
    const max = selectedVariant.stock;
    if (current + 1 > max) return alert("No hay más stock de esta variante");
    setCart((prev) => ({ ...prev, [id]: current + 1 }));
  }

  function removeOne() {
    if (!selectedVariant) return;
    const id = selectedVariant.variantId;
    const current = cart[id] || 0;
    setCart((prev) => ({ ...prev, [id]: Math.max(0, current - 1) }));
  }

  function setQty(id: string, qty: number, stock: number) {
    const q = Math.max(0, Math.min(stock, qty));
    setCart((prev) => ({ ...prev, [id]: q }));
  }

  async function pagar() {
    if (!step1) return;

    setLoadingPay(true);
    try {
      const existingRegId = localStorage.getItem("regId") || "";
      const accessCode = localStorage.getItem("registrationAccessCode") || "";

      const r = await fetch("/api/public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step1, attendees, regId: existingRegId, cart: cartArr, accessCode }),
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
          <Link className="btn" href="/inscripcion/paso-1" style={{ marginTop: 12 }}>
            Ir a Paso 1
          </Link>
        </div>
      </Layout>
    );
  }

  const imgUrl = selectedVariant?.photoUrl ? normalizeDriveUrl(selectedVariant.photoUrl) : "";

  // helpers UI
  const money = (n: unknown) => `$${Number(n || 0).toLocaleString("es-AR")}`;

  const inCart = selectedVariant ? cart[selectedVariant.variantId] || 0 : 0;
  const cartLines = pricing?.extrasLines || [];
  const cartCount = cartLines.reduce((acc, x) => acc + Number(x.qty || 0), 0);

  return (
    <Layout title="Confirmar inscripción">
      <div className="wizard">
        <div className="wizardHead">
          <div>
            <h1 className="wizardTitle">Confirmá y pagá</h1>
            <p className="wizardSub">Revisá que esté todo bien antes de ir a Mercado Pago.</p>
          </div>

          <div className="stepper">
            <div className="step isDone"><span className="stepDot" /> Datos</div>
            <div className="step isDone"><span className="stepDot" /> Personas</div>
            <div className="step isActive"><span className="stepDot" /> Pago</div>
          </div>
        </div>

        {/* QUIÉN SE INSCRIBE */}
        <div className="card cardTight">
          <div className="row-between" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Tu inscripción</h3>
            <Link className="btn ghost sm" href="/inscripcion/paso-2">
              Editar
            </Link>
          </div>

          <div className="row" style={{ marginBottom: 12 }}>
            <span className="chip">📅 {diasTexto(step1)}</span>
            <span className="chip">👥 {attendees.length || step1.count || 1} persona{(attendees.length || step1.count || 1) === 1 ? "" : "s"}</span>
          </div>

          <div className="summaryLine">
            <span className="muted">Principal</span>
            <b>{step1.primaryFirstName} {step1.primaryLastName}</b>
          </div>
          <div className="summaryLine">
            <span className="muted">Email</span>
            <span style={{ wordBreak: "break-all" }}>{step1.email}</span>
          </div>
          {step1.phone ? (
            <div className="summaryLine">
              <span className="muted">WhatsApp</span>
              <span>{step1.phone}</span>
            </div>
          ) : null}

          {attendees.length ? (
            <details className="peopleBox">
              <summary>Ver las {attendees.length} persona{attendees.length === 1 ? "" : "s"}</summary>
              <div className="peopleList">
                {attendees.map((a, i) => (
                  <div className="peopleRow" key={`${a.dni || i}`}>
                    <div>
                      <b>{a.firstName} {a.lastName}</b>
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        {a.relation || "Integrante"}{a.dni ? ` · DNI ${a.dni}` : ""}
                      </div>
                    </div>
                    <span className="badge">{Number(a.age || 0)} años</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {/* MERCH */}
        {hasVariants ? (
          <div className="card cardTight">
            <div className="row-between" style={{ marginBottom: 4 }}>
              <h3 style={{ margin: 0 }}>Sumá remeras y gorras</h3>
              {cartCount ? <span className="badge success">{cartCount} en el carrito</span> : null}
            </div>
            <p className="muted" style={{ fontSize: 13.5 }}>
              Precio preferencial por comprarlas junto con la inscripción.
            </p>

            <div className="segment" role="group" aria-label="Tipo de producto">
              <button
                type="button"
                className={`segBtn ${selType === "tee" ? "isActive" : ""}`}
                onClick={() => { setSelType("tee"); setSelDesign(""); setSelColor(""); }}
              >
                👕 Remeras
              </button>
              <button
                type="button"
                className={`segBtn ${selType === "cap" ? "isActive" : ""}`}
                onClick={() => { setSelType("cap"); setSelDesign(""); setSelColor(""); }}
              >
                🧢 Gorras
              </button>
            </div>

            <div className="formGrid" style={{ marginTop: 12 }}>
              <div>
                <label>Diseño</label>
                <select value={selDesign} onChange={(e) => setSelDesign(e.target.value)}>
                  <option value="" disabled>Seleccionar</option>
                  {designs.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Color</label>
                <select value={selColor} onChange={(e) => setSelColor(e.target.value)}>
                  <option value="" disabled>Seleccionar</option>
                  {colors.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {selType === "tee" && sizes.length ? (
              <div>
                <label>Talle</label>
                <div className="segment">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`segBtn sizeBtn ${selSize === s ? "isActive" : ""}`}
                      onClick={() => setSelSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Producto elegido */}
            <div className="prodCard">
              {imgUrl ? (
                <button
                  type="button"
                  className="prodThumb"
                  onClick={() => setModalUrl(imgUrl)}
                  aria-label="Ver imagen del producto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt={selectedVariant?.sku || "Producto"} />
                </button>
              ) : (
                <div className="prodThumb is-empty" aria-hidden />
              )}

              <div className="prodInfo">
                <b>{selectedVariant ? selectedVariant.productName : "Elegí diseño y color"}</b>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {selectedVariant ? selectedVariant.sku : "Para ver precio y stock"}
                </div>

                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  <span className="prodPrice">
                    {selectedVariant ? money(selectedVariant.priceBundle) : "—"}
                  </span>
                  {selectedVariant ? (
                    <span className={`badge ${selectedVariant.stock > 0 ? "success" : "danger"}`}>
                      {selectedVariant.stock > 0 ? `${selectedVariant.stock} disponibles` : "Sin stock"}
                    </span>
                  ) : null}
                </div>

                {/* Con 0 en el carrito alcanza un boton; despues manda el contador. */}
                <div className="prodActions">
                  {inCart > 0 ? (
                    <div className="stepperNum" style={{ margin: 0, width: 190 }}>
                      <button
                        type="button"
                        className="stepperBtn"
                        onClick={removeOne}
                        aria-label="Quitar uno"
                      >
                        −
                      </button>
                      <div className="stepperValue"><b>{inCart}</b></div>
                      <button
                        type="button"
                        className="stepperBtn"
                        onClick={addOne}
                        disabled={inCart >= (selectedVariant?.stock || 0)}
                        aria-label="Agregar uno"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn"
                      type="button"
                      onClick={addOne}
                      disabled={!selectedVariant || selectedVariant.stock <= 0}
                    >
                      Agregar al carrito
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Carrito: lista, no tabla (mobile) */}
            {cartLines.length ? (
              <div className="cartList">
                {cartLines.map((x) => {
                  const label =
                    `${x.attributes?.design || ""} · ${x.attributes?.color || ""}` +
                    (x.attributes?.size ? ` · ${x.attributes.size}` : "");
                  return (
                    <div className="cartRow" key={x.variantId}>
                      <div className="cartRowMain">
                        <b>{x.name}</b>
                        <div className="muted" style={{ fontSize: 12.5 }}>{label}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>
                          {money(x.unitPrice)} c/u
                        </div>
                      </div>

                      <div className="cartRowSide">
                        <div className="stepperNum" style={{ margin: 0, width: 132 }}>
                          <button
                            type="button"
                            className="stepperBtn sm"
                            onClick={() => setQty(x.variantId, Number(x.qty) - 1, x.stock)}
                            aria-label="Restar"
                          >
                            −
                          </button>
                          <div className="stepperValue"><b>{x.qty}</b></div>
                          <button
                            type="button"
                            className="stepperBtn sm"
                            onClick={() => setQty(x.variantId, Number(x.qty) + 1, x.stock)}
                            disabled={Number(x.qty) >= Number(x.stock)}
                            aria-label="Sumar"
                          >
                            +
                          </button>
                        </div>
                        <b>{money(x.lineTotal)}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>
                Todavía no agregaste productos. Es opcional.
              </p>
            )}

            {pricing?.errors?.length ? (
              <div className="alert" style={{ marginTop: 12 }}>
                {pricing.errors.map((e: string, i: number) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* RESUMEN DE PAGO */}
        <div className="card cardTight payBox">
          <h3 style={{ marginTop: 0 }}>Resumen de pago</h3>

          {!pricing ? (
            <div className="stack" aria-busy="true">
              <div className="skeleton" style={{ height: 18, width: "60%" }} />
              <div className="skeleton" style={{ height: 18, width: "40%" }} />
              <div className="skeleton" style={{ height: 30, width: "50%" }} />
            </div>
          ) : (
            <>
              <div className="summaryLine">
                <span>
                  Inscripción · {pricing.payingPeople} persona{pricing.payingPeople === 1 ? "" : "s"}
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {money(pricing.pricePerPerson)} por persona
                  </div>
                </span>
                <b>{money(pricing.campTotal ?? pricing.total)}</b>
              </div>

              {Number(pricing.discountedCount || 0) > 0 ? (
                <div className="summaryLine">
                  <span>
                    Descuento familiar
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {pricing.discountedCount} persona(s) a {money(pricing.discountedPricePerPerson)}
                    </div>
                  </span>
                  <span className="badge success">10% OFF</span>
                </div>
              ) : null}

              <div className="summaryLine">
                <span>
                  Productos
                  {cartCount ? (
                    <div className="muted" style={{ fontSize: 12.5 }}>{cartCount} ítem(s)</div>
                  ) : null}
                </span>
                <b>{money(pricing.extrasTotal)}</b>
              </div>

              <div className="payTotal">
                <span>Total a pagar</span>
                <span className="kpiBig">{money(pricing.totalFinal)}</span>
              </div>

              <ul className="payNotes">
                <li>Menores de 4 años no abonan.</li>
                <li>1 día = 50%. 2 días o campa completo = total.</li>
                {Number(pricing.discountedCount || 0) > 0 ? null : (
                  <li>Desde el 5° miembro que paga hay 10% OFF sobre el valor individual.</li>
                )}
                <li>Pagás en Mercado Pago: tarjeta, dinero en cuenta o efectivo.</li>
              </ul>
            </>
          )}

          {/* Estatico a proposito: una barra sticky acá taparia los numeros del resumen. */}
          <div className="payActions">
            <button className="btn lg" type="button" onClick={pagar} disabled={loadingPay || !pricing}>
              {loadingPay ? "Procesando..." : `Pagar ${pricing ? money(pricing.totalFinal) : ""}`}
            </button>
            <Link className="btn secondary" href="/inscripcion/paso-2">
              ← Volver
            </Link>
          </div>
        </div>
      </div>

      {/* MODAL IMAGEN */}
      {modalUrl ? (
        <div
          onClick={() => setModalUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(22,33,29,0.66)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 100%)",
              background: "#fff",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Vista previa</b>
              <button className="btn secondary sm" type="button" onClick={() => setModalUrl(null)}>
                Cerrar
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={modalUrl} alt="Producto" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
