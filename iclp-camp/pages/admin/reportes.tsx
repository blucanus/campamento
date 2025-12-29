import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

export default function Reportes() {
  const [r, setR] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/reports").then(x=>x.json()).then(setR);
  }, []);

  return (
    <Layout title="Reportes">
      <div className="card">
        <h2>Reportes</h2>
        {!r ? "Cargando..." : (
          <>
            <h3>Dieta</h3>
            <pre>{JSON.stringify(r.byDiet, null, 2)}</pre>
            <h3>Sexo</h3>
            <pre>{JSON.stringify(r.bySex, null, 2)}</pre>
            <h3>Edades (rangos)</h3>
            <pre>{JSON.stringify(r.byAgeRange, null, 2)}</pre>
          </>
        )}
      </div>
    </Layout>
  );
}
