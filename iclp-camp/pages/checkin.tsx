import Layout from "@/components/Layout";
import dynamic from "next/dynamic";

const Scanner = dynamic(() => import("@/components/QrScanner"), { ssr: false });

export default function Checkin() {
  return (
    <Layout title="Check-in">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Check-in de Asistencia 📲</h2>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Escanea el QR de cada acampante para registrar su ingreso.
        </p>
        <Scanner />
      </div>
    </Layout>
  );
}
