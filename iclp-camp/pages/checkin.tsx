import Layout from "@/components/Layout";
import dynamic from "next/dynamic";

const Scanner = dynamic(() => import("@/components/QrScanner"), { ssr: false });

export default function Checkin() {
  return (
    <Layout title="Check-in">
      <div className="card">
        <h2>Check-in QR</h2>
        <Scanner />
      </div>
    </Layout>
  );
}
