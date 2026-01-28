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
  priceStandalone: number;
};

type CartItem = { variantId: string; qty: number };

/**
 * Google Drive muchas veces no sirve directo para <img>.
 * Esto transforma links comunes en un link directo (uc?export=view&id=...).
 * (Si tus imágenes están en Vercel Blob o /public, no afecta.)
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

export default function MerchPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payerEmail, setPayerEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // modal imagen
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  // selectors
  const [selType, setSelType] = useState<"tee" | "cap">("tee");
  const [selDesign, setSelDesign] = useState("");
  const [selColor, setSelColor] = useState("");
  const [selSize, setSelSize] = useState("M");

  useEffect(() => {
    fetch("/api/public/variants")
      .then((r) => r.json())
      .then((data) => {
        const list: Variant[] = Array.isArray(data) ? data : [];
        setVariants(list);

        // defaults
        const first = list[0];
        if (first) {
          setSelType(first.productType);
          setSelDesign(first.attributes?.design || "");
          setSelColor(first.attributes?.color || "");
          setSelSize(first.attributes?.size || "M");
        }
      })
      .catch(() => setVariants([]));
  }, []);

  const filtered = useMemo(() => {
    return variants.filter((v) => v.productType === selType);
  }, [variants, selType]);

  const designs = useMemo(() => {
    return Array.from(new Set(filtered.map((v) => v.attributes?.design || "")))
      .filter(Boolean)
      .sort();
  }, [filtered]);

  const colors = useMemo(() => {
    return Array.from(
      new Set(filtered.filter((v) => v.attributes?.design === selDesign).map((v) => v.attributes?.color || ""))
    )
      .filter(Boolean)
      .sort();
  }, [filtered, selDesign]);

  const sizes = useMemo(() => {
    if (selType !== "tee") return [];
    return Array.from(
      new Set(
        filtered
          .filter((v) => v.attributes?.design === selDesign && v.attributes?.color === selColor)
          .map((v) => v.attributes?.size || "")
      )
    )
      .filter(Boolean)
      .sort();
  }, [filtered, selDesign, selColor, selType]);

  const selectedVariant = useMemo(() => {
    return filtered.find((v) => {
      if (v.attributes?.design !== selDesign) return false;
      if (v.attributes?.color !== selColor) return false;
      if (selType === "tee") return (v.attributes?.size || "") === selSize;
      return true;
    });
  }, [filtered, selDesign, selColor, selSize, selType]);

  const cartArr: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, qty]) => ({ variantId, qty }));
  }, [cart]);

  const cartLines = useMemo(() => {
    const byId = new Map(variants.map((v) => [v.variantId, v]));
    return cartArr
      .map(({ variantId, qty }) => {
        const v = byId.get(variantId);
        if (!v) return null;
        return { v, qty };
      })
      .filter(Boolean) as { v: Variant; qty: number }[];
  }, [cartArr, variants]);

  const total = useMemo(() => {
    let t = 0;
    for (const line of cartLines) {
      t += line.qty * Number(line.v.priceStandalone || 0);
    }
    return t;
  }, [cartLines]);

  function setQty(id: string, qty: number, stock: number) {
    const q = Math.max(0, Math.min(stock, qty));
    setCart((prev) => ({ ...prev, [id]: q }));
  }

  function addOneSelected() {
    if (!selectedVariant) return alert("Seleccioná una variante");
    const id = selectedVariant.variantId;
    const current = cart[id] || 0;
    const max = selectedVariant.stock;
    if (current + 1 > max) return alert("No hay más stock de esta variante");
    setCart((prev) => ({ ...prev, [id]: current + 1 }));
  }

  function removeOneSelected() {
    if (!selectedVariant) return;
    const id = selectedVariant.variantId;
    const current = cart[id] || 0;
    setCart((prev) => ({ ...prev, [id]: Math.max(0, current - 1) }));
  }

  async function pay() {
    const email = payerEmail.trim().toLowerCase();
    if (!email) return alert("Ingresá un email para el pagador");
    if (cartArr.length === 0) return alert("Carrito vacío");

    setLoading(true);
    try {
      const r = await fetch("/api/public/checkout-merch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: cartArr, payer_email: email }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(j.error || "Error creando pago");
        setLoading(false);
        return;
      }
      window.location.href = j.init_point;
    } catch {
      alert("Error de red");
    } finally {
      setLoading(false);
    }
  }

  const imgUrl = selectedVariant?.photoUrl ? normalizeDriveUrl(selectedVariant.photoUrl) : "";
  const selectedQty = selectedVariant ? cart[selectedVariant.variantId] || 0 : 0;

  return (
    <Layout title="Comprar merch - Campamento ICLP">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Comprar merch</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
              Comprá remeras y gorras sin inscripción (precio <b>comprando aparte</b>).
            </p>
          </div>
          <Link className="btn secondary" href="/">
            Volver
          </Link>
        </div>

        {/* Email */}
        <div className="card" style={{ marginTop: 12 }}>
          <label>
            Email del pagador
            <input value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="email@..." />
          </label>
        </div>

        {/* Selector */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Elegí tu producto</h3>

          {/* Tipo (tabs simples) */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <button
              type="button"
              className={selType === "tee" ? "btn" : "btn secondary"}
              onClick={() => {
                setSelType("tee");
                setSelDesign("");
                setSelColor("");
                setSelSize("M");
              }}
            >
              Remeras
            </button>

            <button
              type="button"
              className={selType === "cap" ? "btn" : "btn secondary"}
              onClick={() => {
                setSelType("cap");
                setSelDesign("");
                setSelColor("");
                setSelSize("M");
              }}
            >
              Gorras
            </button>
          </div>

          <div className="grid2">
            <div>
              <label>Diseño</label>
              <select value={selDesign} onChange={(e) => { setSelDesign(e.target.value); setSelColor(""); }}>
                <option value="" disabled>
                  Seleccionar
                </option>
                {designs.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Color</label>
              <select value={selColor} onChange={(e) => setSelColor(e.target.value)}>
                <option value="" disabled>
                  Seleccionar
                </option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {selType === "tee" ? (
              <div>
                <label>Talle</label>
                <select value={selSize} onChange={(e) => setSelSize(e.target.value)}>
                  {sizes.length ? (
                    sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  ) : (
                    <>
                      {["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            ) : (
              <div />
            )}
          </div>

          {/* Card variante */}
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
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
                  style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}
                />
              </button>
            ) : (
              <div style={{ width: 110, height: 110, borderRadius: 12, background: "rgba(15,118,110,0.08)" }} />
            )}

            <div style={{ minWidth: 260 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {selectedVariant ? selectedVariant.productName : "Seleccioná diseño y color"}
              </div>

              <div style={{ opacity: 0.85, marginTop: 4 }}>
                {selectedVariant ? (
                  <>
                    <b>SKU:</b> {selectedVariant.sku} <span style={{ opacity: 0.6 }}>•</span>{" "}
                    <b>Stock:</b> {selectedVariant.stock}
                  </>
                ) : (
                  "Elegí una variante para ver precio y stock."
                )}
              </div>

              <div style={{ opacity: 0.9, marginTop: 6 }}>
                <b>Precio:</b>{" "}
                ${selectedVariant ? Number(selectedVariant.priceStandalone).toLocaleString("es-AR") : "-"}
              </div>

              {/* Cantidad con + / - */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={removeOneSelected}
                    disabled={!selectedVariant || selectedQty <= 0}
                  >
                    −
                  </button>

                  <div style={{ minWidth: 40, textAlign: "center", fontWeight: 800 }}>
                    {selectedVariant ? selectedQty : 0}
                  </div>

                  <button className="btn" type="button" onClick={addOneSelected} disabled={!selectedVariant}>
                    +
                  </button>
                </div>

                {selectedVariant ? (
                  <small style={{ opacity: 0.85 }}>
                    Máximo: {selectedVariant.stock} unidad{selectedVariant.stock === 1 ? "" : "es"}
                  </small>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Tu carrito</h3>

          {cartLines.length ? (
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th>$</th>
                  <th>Cant.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {cartLines.map(({ v, qty }) => {
                  const label =
                    `${v.attributes?.design || ""} - ${v.attributes?.color || ""}` +
                    (v.attributes?.size ? ` - ${v.attributes.size}` : "");
                  const lineTotal = qty * Number(v.priceStandalone || 0);

                  return (
                    <tr key={v.variantId}>
                      <td style={{ whiteSpace: "nowrap" }}>{v.productName}</td>
                      <td>{label}</td>
                      <td>${Number(v.priceStandalone || 0).toLocaleString("es-AR")}</td>
                      <td style={{ width: 170 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => setQty(v.variantId, qty - 1, v.stock)}
                            disabled={qty <= 0}
                          >
                            −
                          </button>

                          <div style={{ minWidth: 34, textAlign: "center", fontWeight: 800 }}>{qty}</div>

                          <button
                            className="btn"
                            type="button"
                            onClick={() => setQty(v.variantId, qty + 1, v.stock)}
                            disabled={qty + 1 > v.stock}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>${Number(lineTotal).toLocaleString("es-AR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ opacity: 0.8 }}>Todavía no agregaste productos.</p>
          )}

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <b>Total:</b> ${Number(total).toLocaleString("es-AR")}
            </div>

            <button className="btn" type="button" onClick={pay} disabled={loading || cartLines.length === 0}>
              {loading ? "Procesando..." : "Pagar"}
            </button>
          </div>

          <small style={{ display: "block", marginTop: 10, opacity: 0.85 }}>
            * El stock se valida al iniciar el pago.
          </small>
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
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(820px, 100%)",
              background: "#fff",
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Vista previa</b>
              <button className="btn secondary" type="button" onClick={() => setModalUrl(null)}>
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
