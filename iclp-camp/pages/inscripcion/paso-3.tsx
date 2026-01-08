import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";

export default function Paso3() {
  const [step1, setStep1] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStep1(JSON.parse(localStorage.getItem("step1") || "null"));
    setAttendees(JSON.parse(localStorage.getItem("step2") || "[]"));
  }, []);

  const summary = useMemo(() => {
    if (!step1) return null;
    const principal = attendees.find((a) => a.isPrimary) || attendees[0];
    return { principal };
  }, [step1, attendees]);

  async function pagar() {
  setLoading(true);
  try {
    const body = { step1, attendees };
    const r = await fetch("/api/public/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      alert(j.error || "Error al iniciar el pago. Revisá logs en Vercel.");
      setLoading(false);
      return;
    }

    if (!j.init_point) {
      alert("No se recibió init_point de Mercado Pago.");
      setLoading(false);
      return;
    }

    window.location.href = j.init_point;
  } catch (err: any) {
    alert("Error de red / servidor al iniciar el pago.");
    setLoading(false);
  }
}


  if (!step1) {
    return (
      <Layout title="Confirmar inscripción">
        <div className="card">
          <div className="alert">No se encontraron datos del Paso 1. Volvé a iniciar la inscripción.</div>
          <a className="btn" href="/inscripcion/paso-1">Ir a Paso 1</a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Confirmar inscripción">
      <div className="card">
        <h2>Confirmar inscripción</h2>

        <p><b>Principal:</b> {step1.primaryName} ({step1.phone}) {step1.email ? `- ${step1.email}` : ""}</p>
        <p><b>Cantidad:</b> {step1.count}</p>
        <p><b>Días:</b> {step1.optionDays} {step1.daysDetail ? `(${step1.daysDetail})` : ""}</p>

        <h3>Integrantes</h3>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Edad</th>
              <th>Relación</th>
              <th>Dieta</th>
              <th>Sexo</th>
              <th>Principal</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((a, idx) => (
              <tr key={idx}>
                <td>{a.firstName} {a.lastName}</td>
                <td>{a.dni}</td>
                <td>{a.age}</td>
                <td>{a.isPrimary ? "Principal" : a.relation}</td>
                <td>{a.diet}</td>
                <td>{a.sex === "M" ? "Masculino" : "Femenino"}</td>
                <td>{a.isPrimary ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={pagar} disabled={loading}>
            {loading ? "Procesando..." : "Confirmar y pagar"}
          </button>{" "}
          <a className="btn secondary" href="/inscripcion/paso-2">Volver</a>
        </div>

        <small style={{ display: "block", marginTop: 10 }}>
          * El cobro real por Mercado Pago lo activamos en el bloque final.
        </small>
      </div>
    </Layout>
  );
}
