import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

function AdminTabsMini() {
  const Item = ({ href, label }: any) => (
    <a
      href={href}
      style={{
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        fontWeight: 800,
        fontSize: 13
      }}
    >
      {label}
    </a>
  );
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <Item href="/admin" label="Inscripciones" />
      <Item href="/admin/merch" label="Merch" />
      <Item href="/admin/reportes" label="Reportes" />
    </div>
  );
}

export default function AdminMerchDetail() {
  const { query, back } = useRouter();
  const id = String(query.id || "");
  const [order, setOrder] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/merch-order?id=" + id);
    const j = await r.json();
    setOrder(j);
  }

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  const buyerName = useMemo(() => {
    if (!order) return "-";
    return `${order.buyer?.firstName || ""} ${order.buyer?.lastName || ""}`.trim() || "-";
  }, [order]);

  async function toggleDelivered() {
    if (!order) return;
    const next = !order.delivered;

    setOrder((prev: any) => ({
      ...prev,
      delivered: next,
      deliveredAt: next ? new Date().toISOString() : null
    }));

    setSaving(true);
    try {
      const r = await fetch("/api/admin/toggle-merch-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id, delivered: next })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo guardar");
      setOrder((prev: any) => ({
        ...prev,
        delivered: j.delivered,
        deliveredAt: j.deliveredAt,
        deliveredBy: j.deliveredBy
      }));
    } catch {
      setOrder((prev: any) => ({
        ...prev,
        delivered: !next
      }));
      alert("No se pudo guardar la entrega");
    } finally {
      setSaving(false);
    }
  }

  if (!order) {
    return (
      <Layout title="Detalle compra merch">
        <div className="card">Cargando...</div>
      </Layout>
    );
  }

  const total = Number(order.totalARS || 0);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <Layout title="Detalle compra merch">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>{buyerName}</h2>
            <div style={{ opacity: 0.85, marginBottom: 10 }}>
              <b>Email:</b> {order.buyer?.email || "-"}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span><b>Pago:</b></span>
              <Badge tone={paymentStatusTone(order.payment?.status)}>
                {paymentStatusLabel(order.payment?.status)}
              </Badge>

              {order.delivered ? (
                <Badge tone="success">✅ Entregado</Badge>
              ) : (
                <Badge tone="warning">⏳ Pendiente</Badge>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <AdminTabsMini />

            <button className="btn secondary" type="button" onClick={() => back()}>
              ← Volver
            </button>

            <button className="btn" type="button" onClick={toggleDelivered} disabled={saving}>
              {saving ? "Guardando..." : order.delivered ? "Marcar NO entregado" : "Marcar entregado"}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Productos</h3>

        {items.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th>SKU</th>
                  <th>Cant.</th>
                  <th>$ Unit</th>
                  <th>$ Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x: any, i: number) => {
                  const label =
                    `${x.attributes?.design || ""} - ${x.attributes?.color || ""}` +
                    (x.attributes?.size ? ` - ${x.attributes.size}` : "");
                  const unit = Number(x.unitPrice || 0);
                  const qty = Number(x.qty || 0);

                  return (
                    <tr key={i}>
                      <td>{x.name || "-"}</td>
                      <td>{label || "-"}</td>
                      <td>{x.sku || "-"}</td>
                      <td>{qty}</td>
                      <td>${unit.toLocaleString("es-AR")}</td>
                      <td>${(unit * qty).toLocaleString("es-AR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ opacity: 0.8 }}>No hay productos.</p>
        )}

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <div>
            <b>Total:</b> ${total.toLocaleString("es-AR")}
          </div>
        </div>
      </div>
    </Layout>
  );
}
