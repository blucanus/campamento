import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { useEffect, useState } from "react";

type Report = {
  bySex?: Record<string, number>;
  byDiet?: Record<string, number>;
  byRestriction?: Record<string, number>;
  menuBase?: number;
  menuExclusivo?: number;
  totalAttendees?: number;
};

function CountList({ data }: { data?: Record<string, number> }) {
  const rows = Object.entries(data || {});
  if (!rows.length) return <p className="muted">Sin datos.</p>;

  return (
    <ul>
      {rows.map(([k, v]) => (
        <li key={k}><b>{k}:</b> {v}</li>
      ))}
    </ul>
  );
}

export default function Reportes() {
  const [rep, setRep] = useState<Report | null>(null);

  useEffect(() => {
    // El endpoint es /api/admin/reports (antes se pedia /reportes y nunca cargaba).
    fetch("/api/admin/reports")
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
              <div className="row">
                <Badge tone="muted">👥 {rep.totalAttendees || 0} asistentes</Badge>
                <Badge tone="success">{rep.menuBase || 0} menú base</Badge>
                <Badge tone="warning">⚠️ {rep.menuExclusivo || 0} menú exclusivo</Badge>
              </div>
            </div>

            <div>
              <h3>Por sexo</h3>
              <CountList data={rep.bySex} />
            </div>

            <div>
              <h3>Por restricción alimentaria</h3>
              <p className="muted" style={{ fontSize: 13.5 }}>
                Una persona puede tener más de una, así que el total puede no coincidir con
                los {rep.menuExclusivo || 0} del menú exclusivo.
              </p>
              <CountList data={rep.byRestriction} />
            </div>

            <div>
              <h3>Por dieta (combinación)</h3>
              <CountList data={rep.byDiet} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
