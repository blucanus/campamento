import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

export default function Admin() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/registrations")
      .then(r => r.json())
      .then(setData);
  }, []);

  return (
    <Layout title="Admin">
      <div className="card">
        <h2>Inscripciones</h2>
        <a className="btn" href="/admin/login">Login</a>{" "}
        <a className="btn secondary" href="/admin/reportes">Reportes</a>{" "}
        <a className="btn secondary" href="/api/admin/export?format=csv">Export CSV</a>{" "}
        <a className="btn secondary" href="/api/admin/export?format=xlsx">Export Excel</a>

        <table style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Principal</th>
              <th>Tel</th>
              <th>Personas</th>
              <th>Pago</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r._id}>
                <td>{r.primary?.name}</td>
<td>{r.primary?.phone}</td>
                <td>{r.attendees?.length}</td>
                <td>{r.payment?.status}</td>
                <td><a href={`/admin/registro/${r._id}`}>Ver</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
