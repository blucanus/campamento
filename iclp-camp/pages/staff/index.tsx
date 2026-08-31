import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = {
  _id: string;
  primary?: { name?: string; phone?: string };
  attendees?: unknown[];
  payment?: { status?: string; initPoint?: string };
  createdAt?: string;
};

async function copyPay(link: string) {
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    alert("📋 Link de pago copiado");
  } catch {
    window.prompt("Copiá el link:", link);
  }
}

export default function Staff() {
  const [data, setData] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const url = q ? `/api/admin/registrations?q=${encodeURIComponent(q)}` : "/api/admin/registrations";
    const r = await fetch(url);
    if (r.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const j = await r.json().catch(() => []);
    setData(Array.isArray(j) ? j : []);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout title="Staff">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center"
          }}
        >
          <div>
            <h2 style={{ marginBottom: 4 }}>Staff</h2>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {loading ? "Cargando..." : `${data.length} inscripciones`}
            </div>
          </div>

          <Link className="btn" href="/inscripcion/paso-1">
            ➕ Nueva inscripción
          </Link>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Buscar por nombre, DNI, tel o email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 280px" }}
          />
          <button className="btn secondary" type="button" onClick={load}>
            Actualizar
          </button>
        </div>

        <div className="tableWrap" style={{ marginTop: 14 }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Principal</th>
                <th>Tel</th>
                <th>Personas</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 800 }}>{r.primary?.name}</td>
                  <td>{r.primary?.phone || "-"}</td>
                  <td>{r.attendees?.length || 0}</td>
                  <td>
                    <Badge tone={paymentStatusTone(r.payment?.status)}>
                      {paymentStatusLabel(r.payment?.status)}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link className="btn" href={`/staff/cobrar/${r._id}`}>
                        💳 Cobrar
                      </Link>
                      {r.payment?.initPoint && String(r.payment?.status || "").toLowerCase() !== "approved" ? (
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => copyPay(String(r.payment?.initPoint || ""))}
                        >
                          📋 Link
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!data.length && !loading ? (
                <tr>
                  <td colSpan={5} style={{ opacity: 0.7 }}>
                    No hay resultados
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
