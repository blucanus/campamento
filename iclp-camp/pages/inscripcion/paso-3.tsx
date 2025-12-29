import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

export default function Paso3() {
  const [ok, setOk] = useState(false);

  async function pagar() {
    const body = {
      step1: JSON.parse(localStorage.getItem("step1") || "{}"),
      attendees: JSON.parse(localStorage.getItem("step2") || "[]")
    };
    const r = await fetch("/api/public/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    window.location.href = j.init_point;
  }

  return (
    <Layout title="Confirmar y pagar">
      <div className="card">
        <h2>Confirmar inscripción</h2>
        <p>Revisá los datos y continuá al pago.</p>
        <button className="btn" onClick={pagar}>Ir a pagar</button>
      </div>
    </Layout>
  );
}
