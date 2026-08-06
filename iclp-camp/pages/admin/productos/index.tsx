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
        <div className="row-between">
          <div>
            <h2 style={{ margin: 0 }}>Productos</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              El stock, las fotos y los precios se cargan en Variantes.
            </div>
          </div>
          <div className="row">
            <Link className="btn" href="/admin/variants">Cargar / editar variantes</Link>
            <Link className="btn secondary" href="/admin">← Volver</Link>
          </div>
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
                  {/* /admin/productos/[id] no existe: la carga real vive en /admin/variants. */}
                  <Link className="btn sm" href="/admin/variants">Ver variantes</Link>
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
