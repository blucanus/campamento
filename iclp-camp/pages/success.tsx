import Layout from "@/components/Layout";
import { useRouter } from "next/router";

export default function Success() {
  const { query } = useRouter();
  return (
    <Layout title="Listo">
      <div className="card">
        <h2>¡Inscripción registrada!</h2>
        <p>Registro: <b>{String(query.reg || "")}</b></p>
        <a className="btn" href="/">Volver al inicio</a>
      </div>
    </Layout>
  );
}
