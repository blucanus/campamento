import Layout from "@/components/Layout";
import Link from "next/link";

export default function MPSuccess() {
  return (
    <Layout title="Pago en proceso">
      <div className="card">
        <h2>¡Gracias!</h2>
        <p>Recibimos el pago. En unos instantes se confirmará automáticamente (si ya está aprobado).</p>
        <p>Te llega un email cuando el pago quede confirmado.</p>
        <Link className="btn" href="/">Volver al inicio</Link>
      </div>
    </Layout>
  );
}
