import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import { useEffect, useState } from "react";

function AdminTabs({ active }: { active: "inscripciones" | "reportes" | "merch" }) {
  const Item = ({ href, label, keyName }: any) => (
    <a
      href={href}
      style={{
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: active === keyName ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)",
        fontWeight: 800,
        fontSize: 13
      }}
    >
      {label}
    </a>
  );

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <Item href="/admin" label="Inscripciones" keyName="inscripciones" />
      <Item href="/admin/merch" label="Merch" keyName="merch" />
      <Item href="/admin/reportes" label="Reportes" keyName="reportes" />
    </div>
  );
}

export default function AdminMerch() {
  const [data, setData] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const url = q ? `/api/admin/merch-orders?q=${encodeURIComponent(q)}` : `/api/admin/merch-orders`;
    const r = await fetch(url);
    const j = await r.json();
    setData(Array.isArray(j) ? j : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [q]);

  async function toggleDelivered(orderId: string, next: boolean) {
    const prev = data;
    setData((p) => p.map((o) => (o._id === orderId ? { ...o, delivered: next } : o)));

    try {
      const r = await fetch("/api/admin/toggle-merch-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, delivered: next })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo guardar");
      setData((p) =>
        p.map((o) => (o._id === orderId ? { ...o, delivered: j.delivered, deliveredAt: j.deliveredAt } : o))
      );
    } catch {
      setData(prev);
      alert("No se pudo guardar la entrega");
    }
  }

  return (
    <Layout title="Admin - Merch">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Merch</h2>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {loading ? "Cargando..." : `${data.length} compras`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a className="btn" href="/merch">➕ Comprar MERCH</a>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <AdminTabs active="merch" />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Buscar por nombre, email o SKU…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ width: 360, maxWidth: "100%" }}
            />
            <button className="btn secondary" onClick={load} type="button">Actualizar</button>
          </div>
        </div>

        <div style={{ marginTop: 14, width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Comprador</th>
                <th>Email</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Entrega</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((o: any) => (
                <tr key={o._id}>
                  <td style={{ fontWeight: 800 }}>{o.buyer?.name || "-"}</td>
                  <td>{o.buyer?.email || "-"}</td>
                  <td>
                    <div style={{ fontWeight: 800 }}>{o.itemsCount || 0} item(s)</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      {(o.items || []).map((it: any) => `${it.sku || it.name || "Producto"} x${it.qty || 0}`).join(" • ")}
                    </div>
                  </td>
                  <td>${Number(o.totalARS || 0).toLocaleString("es-AR")}</td>
                  <td>
                    {o.delivered ? <Badge tone="success">✅ Entregado</Badge> : <Badge tone="warning">⏳ Pendiente</Badge>}
                  </td>
                  <td>
                    <Badge tone={paymentStatusTone(o.payment?.status)}>
                      {paymentStatusLabel(o.payment?.status)}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a className="btn secondary" href={`/admin/merch/${o._id}`}>Ver</a>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => toggleDelivered(o._id, !o.delivered)}
                      >
                        {o.delivered ? "Marcar NO entregado" : "Marcar entregado"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!data.length && !loading && (
                <tr>
                  <td colSpan={7} style={{ opacity: 0.7 }}>No hay resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
