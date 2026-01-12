import Layout from "@/components/Layout";

export default function ProductosAdmin() {
  return (
    <Layout title="Productos">
      <div className="card">
        <h2>Productos</h2>
        <p style={{ opacity: 0.8 }}>
          Esta sección está en preparación. Por ahora administrá variantes desde el panel actual.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <a className="btn" href="/admin">← Volver a Inscripciones</a>
          <a className="btn secondary" href="/admin/variants">Variantes</a>
        </div>
      </div>
    </Layout>
  );
}
