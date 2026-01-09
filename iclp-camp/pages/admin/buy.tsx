import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Variant = {
  variantId: string;
  productType: string;
  productName: string;
  sku: string;
  attributes: { design: string; color: string; size?: string };
  photoUrl: string;
  stock: number;
  priceStandalone: number;
};

export default function AdminBuy() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payerEmail, setPayerEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/variants")
      .then(r => r.json())
      .then(setVariants)
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

  function setQty(id: string, qty: number) {
    setCart(prev => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  async function pay() {
    if (!payerEmail) return alert("Ingresá un email para el pagador");
    const cartArr = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, qty]) => ({ variantId, qty }));

    if (cartArr.length === 0) return alert("Carrito vacío");

    setLoading(true);
    try {
      const r = await fetch("/api/admin/checkout-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: cartArr, payer_email: payerEmail })
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

  return (
    <Layout title="Admin - Comprar productos">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <h2>Comprar productos (Admin)</h2>
          <Link className="btn secondary" href="/admin/variants">Volver</Link>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <label>
            Email del pagador
            <input value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="email@..." />
          </label>
          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Se cobrará con <b>precio comprando aparte</b>.
          </p>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>Catálogo</h3>

          <table>
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
              {variants.map(v => {
                const label =
                  `${v.attributes.design} - ${v.attributes.color}` +
                  (v.attributes.size ? ` - ${v.attributes.size}` : "");
                const qty = cart[v.variantId] || 0;
                return (
                  <tr key={v.variantId}>
                    <td>{v.productName}</td>
                    <td>{label}</td>
                    <td>{v.stock}</td>
                    <td>${Number(v.priceStandalone || 0).toLocaleString("es-AR")}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={v.stock}
                        value={qty}
                        onChange={(e) => setQty(v.variantId, Number(e.target.value))}
                        style={{ width: 90 }}
                      />
                    </td>
                  </tr>
                );
              })}
              {variants.length === 0 ? (
                <tr><td colSpan={5} style={{ opacity: 0.7 }}>No hay variantes activas.</td></tr>
              ) : null}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><b>Total:</b> ${total.toLocaleString("es-AR")}</div>
            <button className="btn" onClick={pay} disabled={loading}>
              {loading ? "Procesando..." : "Pagar"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
