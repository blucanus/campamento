import Layout from "@/components/Layout";
import { useState } from "react";

export default function MiHabitacion() {
  const [dni, setDni] = useState("");
  const [data, setData] = useState<any>(null);

  async function buscar() {
    const r = await fetch("/api/public/dni-lookup?dni=" + dni);
    setData(await r.json());
  }

  return (
    <Layout title="Mi habitación">
      <div className="card">
        <input placeholder="Ingresá tu DNI" value={dni}
          onChange={e => setDni(e.target.value)} />
        <button className="btn" onClick={buscar}>Buscar</button>

        {data && (
          <div style={{ marginTop: 20 }}>
            <p><b>Habitación:</b> {data.room}</p>
            <p><b>Cama:</b> {data.bed}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
