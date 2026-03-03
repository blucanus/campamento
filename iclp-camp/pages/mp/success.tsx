import Layout from "@/components/Layout";
import Link from "next/link";
import { useEffect } from "react";

export default function MPSuccess() {
  useEffect(() => {
    // Pago ok: limpiamos para evitar duplicados en futuras inscripciones
    localStorage.removeItem("regId");
    localStorage.removeItem("step1");
    localStorage.removeItem("step2");
    localStorage.removeItem("registrationAccessCode");
  }, []);

  return (
    <Layout title="Pago en proceso">
      <div className="card">
        <h2>¡Gracias!</h2>
        <p>Recibimos el pago. Te va a llegar un email cuando quede confirmado.</p>
        <Link className="btn" href="/">Volver al inicio</Link>
      </div>
    </Layout>
  );
}
