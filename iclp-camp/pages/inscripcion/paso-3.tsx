import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { computeTotalARS } from "@/lib/pricing";

export default function Paso3() {
  const [step1, setStep1] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>(""); // por si en el futuro querés QR, hoy no se usa

  useEffect(() => {
    setStep1(JSON.parse(localStorage.getItem("step1") || "null"));
    setAttendees(JSON.parse(localStorage.getItem("step2") || "[]"));
  }, []);

  const pricing = useMemo(() => {
    if (!step1) return null;
    try {
      return computeTotalARS(step1, attendees);
    } catch {
      return null;
    }
  }, [step1, attendees]);

  async function pagar() {
    if (!step1) return;
    setLoading(true);

    try {
      const existingRegId = localStorage.getItem("regId") || "";

      const r = await fetch("/api/public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step1, attendees, regId: existingRegId })
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        alert(j.error || "Error al iniciar el pago. Revisá los logs en Vercel.");
        setLoading(false);
        return;
      }

      // Guardar regId para reintentos (evita duplicados)
      if (j.regId) localStorage.setItem("regId", j.regId);

      // Si ya estaba pagado (caso raro), avisamos
      if (j.alreadyPaid) {
        alert("Esta inscripción ya figura como pagada.");
        setLoading(false);
        return;
      }

      if (!j.init_point) {
        alert("No se recibió link de pago (init_point).");
        setLoading(false);
        return;
      }

      // Redirect a MP
      window.location.href = j.init_point;
    } catch {
      alert("Error de red/servidor al iniciar el pago.");
      setLoading(false);
    }
  }

  if (!step1) {
    return (
      <Layout title="Confirmar inscripción">
        <div className="card">
          <div className="alert">
            No se encontraron datos del Paso 1. Volvé a iniciar la inscripción.
          </div>
          <Link className="btn" href="/inscripcion/paso-1">Ir a Paso 1</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Confirmar inscripción">
      <div className="card">
        <h2>Confirmar inscripción</h2>

        <p>
          <b>Principal:</b> {step1.primaryFirstName} {step1.primaryLastName} ({step1.phone}) - {step1.email}
        </p>
        <p><b>Cantidad:</b> {step1.count}</p>
        <p>
          <b>Días:</b>{" "}
          {step1.optionDays === "full"
            ? "Todo el campa"
            : step1.optionDays === "1"
            ? `1 día (${step1.daysDetail})`
            : `2 días (${step1.daysDetail})`}
        </p>

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

        {/* BONUS: resumen de pago */}
        {pricing && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Resumen de pago</h3>
            <p><b>Personas que pagan (&gt;= 4 años):</b> {pricing.payingPeople}</p>
            <p><b>Precio por persona:</b> ${pricing.pricePerPerson.toLocaleString("es-AR")}</p>
            <p><b>Total:</b> <span style={{ fontSize: 18 }}>${pricing.total.toLocaleString("es-AR")}</span></p>
            <small>
              * Menores de 4 años no abonan. 1 día = 50% del total. 2 días o campa completo = total.
            </small>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn" onClick={pagar} disabled={loading}>
            {loading ? "Procesando..." : "Confirmar y pagar"}
          </button>
          <Link className="btn secondary" href="/inscripcion/paso-2">Volver</Link>
        </div>

        <small style={{ display: "block", marginTop: 10 }}>
          * Mercado Pago puede pedirte email o iniciar sesión antes de mostrar los medios de pago.
        </small>
      </div>
    </Layout>
  );
}
