import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { useEffect, useState } from "react";

export default function Reportes() {
  const [rep, setRep] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/reportes")
      .then(r => r.json())
      .then(setRep);
  }, []);

  return (
    <Layout title="Reportes">
      <div className="card">
        <h2>Reportes</h2>
        <a className="btn secondary" href="/admin">← Volver</a>

        {!rep ? (
          <p style={{ marginTop: 12 }}>Cargando…</p>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            <div>
              <h3>Totales</h3>
              <Badge tone="muted">👥 {rep.totalAttendees || 0} asistentes</Badge>
            </div>

            <div>
              <h3>Por sexo</h3>
              <ul>
                {Object.entries(rep.bySex || {}).map(([k, v]: any) => (
                  <li key={k}><b>{k}:</b> {v}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3>Por dieta</h3>
              <ul>
                {Object.entries(rep.byDiet || {}).map(([k, v]: any) => (
                  <li key={k}><b>{k}:</b> {v}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
