import Layout from "@/components/Layout";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProductosAdmin() {
  const [data, setData] = useState<any[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/products")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Error");
        return j;
      })
      .then(setData)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  return (
    <Layout title="Productos">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Productos</h2>
          <Link className="btn secondary" href="/admin">← Volver</Link>
        </div>

        {err ? <div className="alert" style={{ marginTop: 10 }}>{err}</div> : null}

        <table style={{ width: "100%", marginTop: 14 }}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Variantes</th>
              <th>Activas</th>
              <th>Stock total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p._id}>
                <td><b>{p.name}</b></td>
                <td>{p.type}</td>
                <td>{p.variantsCount}</td>
                <td>{p.activeCount}</td>
                <td>{p.stockTotal}</td>
                <td style={{ textAlign: "right" }}>
                  <Link className="btn" href={`/admin/productos/${p._id}`}>Variantes</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!data.length && !err ? <p style={{ opacity: 0.7, marginTop: 12 }}>No hay productos.</p> : null}
      </div>
    </Layout>
  );
}
