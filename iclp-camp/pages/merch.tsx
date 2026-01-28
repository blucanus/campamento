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
  isActive?: boolean;
};

export default function MerchPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payerEmail, setPayerEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/variants")
      .then((r) => r.json())
      .then((data) => setVariants(Array.isArray(data) ? data : []))
      .catch(() => setVariants([]));
  }, []);

  const total = useMemo(() => {
    let t = 0;
    for (const v of variants) {
      const qty = cart[v.variantId] || 0;
      if (qty > 0) t += qty * Number(v.priceStandalone || 0);
    }
    return t;
  }, [variants, cart]);

  function setQty(id: string, qty: number, stock: number) {
    const q = Math.max(0, Math.min(stock, Number.isFinite(qty) ? qty : 0));
    setCart((prev) => ({ ...prev, [id]: q }));
  }

  async function pay() {
    const email = payerEmail.trim().toLowerCase();
    if (!email) return alert("Ingresá un email para el pagador");

    const cartArr = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, qty]) => ({ variantId, qty }));

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

      if (!j.init_point) {
        alert("No se recibió init_point");
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

  return (
    <Layout title="Merch - Campamento ICLP">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Comprar merch</h2>
          <Link className="btn secondary" href="/">
            Volver
          </Link>
        </div>

        <p style={{ opacity: 0.85, marginTop: 8 }}>
          Compra remeras y gorras sin inscripción. Se cobra con precio <b>comprando aparte</b>.
        </p>

        <div className="card" style={{ marginTop: 12 }}>
          <label>
            Email del pagador
            <input value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="email@..." />
          </label>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>Catálogo</h3>

          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Variante</th>
                <th>Stock</th>
                <th>$ Aparte</th>
                <th>Cant.</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const label =
                  `${v.attributes?.design || ""} - ${v.attributes?.color || ""}` +
                  (v.attributes?.size ? ` - ${v.attributes.size}` : "");
                const qty = cart[v.variantId] || 0;

                return (
                  <tr key={v.variantId}>
                    <td style={{ whiteSpace: "nowrap" }}>{v.productName}</td>
                    <td>{label}</td>
                    <td>{v.stock}</td>
                    <td>${Number(v.priceStandalone || 0).toLocaleString("es-AR")}</td>
                    <td style={{ width: 120 }}>
                      <input
                        type="number"
                        min={0}
                        max={v.stock}
                        value={qty}
                        onChange={(e) => setQty(v.variantId, Number(e.target.value), v.stock)}
                        style={{ width: 90 }}
                      />
                    </td>
                  </tr>
                );
              })}

              {variants.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ opacity: 0.7 }}>
                    No hay variantes activas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <b>Total:</b> ${total.toLocaleString("es-AR")}
            </div>

            <button className="btn" onClick={pay} disabled={loading}>
              {loading ? "Procesando..." : "Pagar"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
