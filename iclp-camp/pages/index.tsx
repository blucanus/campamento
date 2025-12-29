import Layout from "@/components/Layout";
import camp from "@/camp.config.json";
import Link from "next/link";

export default function Home() {
  return (
    <Layout>
      <section className="hero">
        <h1 style={{ marginTop: 0 }}>{camp.title}</h1>
        <p style={{ margin: "8px 0" }}>{camp.subtitle}</p>
        <p style={{ margin: "10px 0" }}>
          <strong>Fechas:</strong> {camp.dates} &nbsp;|&nbsp; <strong>Lugar:</strong> {camp.place}
        </p>
        <Link className="btn" href="/inscripcion/paso-1">
          Inscribirme
        </Link>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Información</h2>
        <ul>
          {camp.bullets.map((b, idx) => (
            <li key={idx}>{b}</li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}