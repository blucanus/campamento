import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import { useEffect, useState } from "react";

function AdminTabs({ active }: { active: "inscripciones" | "reportes"  }) {
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
      <Item href="/admin/reportes" label="Reportes" keyName="reportes" />
    </div>
  );
}

export default function Admin() {
  const [data, setData] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const url = q ? `/api/admin/registrations?q=${encodeURIComponent(q)}` : `/api/admin/registrations`;
    const r = await fetch(url);
    const j = await r.json();
    setData(Array.isArray(j) ? j : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [q]);

  return (
    <Layout title="Admin">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Admin</h2>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {loading ? "Cargando..." : `${data.length} registros`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a className="btn" href="/inscripcion/paso-1?admin=1">➕ Inscribir</a>
            <a className="btn" href="/merch">➕ Comprar MERCH</a>
            <a className="btn secondary" href="/api/admin/export?format=csv">CSV</a>
            <a className="btn secondary" href="/api/admin/export?format=xlsx">Excel</a>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <AdminTabs active="inscripciones" />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Buscar por nombre, email, tel o DNI…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ width: 360, maxWidth: "100%" }}
            />
            <button className="btn secondary" onClick={load} type="button">Actualizar</button>
          </div>
        </div>

        {/* ✅ tabla 100% */}
        <div style={{ marginTop: 14, width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Principal</th>
                <th>Tel</th>
                <th>Personas</th>
                <th>Productos</th>
                <th>Entrega</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 800 }}>{r.primary?.name}</td>
                  <td>{r.primary?.phone || "-"}</td>
                  <td>{r.attendees?.length || 0}</td>
                  <td>{r.hasExtras ? <Badge tone="muted">🛍️ Sí</Badge> : "—"}</td>
                  <td>
                    {r.hasExtras ? (
                      r.extrasDelivered ? <Badge tone="success">✅ Entregado</Badge> : <Badge tone="warning">⏳ Pendiente</Badge>
                    ) : "—"}
                  </td>
                  <td>
                    <Badge tone={paymentStatusTone(r.payment?.status)}>
                      {paymentStatusLabel(r.payment?.status)}
                    </Badge>
                  </td>
                  <td>
                    <a className="btn secondary" href={`/admin/registro/${r._id}`}>Ver</a>
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
