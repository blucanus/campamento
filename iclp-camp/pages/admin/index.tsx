import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

export default function Admin() {
  const [data, setData] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const url = q
      ? `/api/admin/registrations?q=${encodeURIComponent(q)}`
      : `/api/admin/registrations`;

    fetch(url)
      .then(r => r.json())
      .then(setData);
  }, [q]);

  return (
    <Layout title="Admin">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2>Inscripciones</h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn" href="/inscripcion/paso-1?admin=1">➕ Inscribir directo</a>
            <a className="btn secondary" href="/admin/reportes">Reportes</a>
            <a className="btn secondary" href="/api/admin/export?format=csv">CSV</a>
            <a className="btn secondary" href="/api/admin/export?format=xlsx">Excel</a>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <input
            placeholder="Buscar por nombre, email, tel o DNI…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <table style={{ marginTop: 14 }}>
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
                <td>{r.primary?.name}</td>
                <td>{r.primary?.phone || "-"}</td>
                <td>{r.attendees?.length || 0}</td>
                <td>
                  {r.hasExtras ? "🛍️ Sí" : "—"}
                </td>
                <td>
                  {r.extrasDelivered
                    ? "✅ Entregado"
                    : r.hasExtras
                      ? "⏳ Pendiente"
                      : "—"}
                </td>
                <td>{r.payment?.status}</td>
                <td>
                  <a className="btn secondary" href={`/admin/registro/${r._id}`}>
                    Ver
                  </a>
                </td>
              </tr>
            ))}

            {!data.length && (
              <tr>
                <td colSpan={7} style={{ opacity: 0.7 }}>
                  No hay resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
