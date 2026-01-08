import Layout from "@/components/Layout";
import Link from "next/link";

export default function MPFailure() {
  return (
    <Layout title="Pago no realizado">
      <div className="card">
        <h2>No se pudo completar el pago</h2>
        <p>Podés intentar nuevamente desde la inscripción.</p>
        <Link className="btn" href="/inscripcion/paso-1">Reintentar</Link>
      </div>
    </Layout>
  );
}
