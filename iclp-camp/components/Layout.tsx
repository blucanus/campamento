import Head from "next/head";
import Link from "next/link";

export default function Layout({ title, children }: { title?: string; children: any }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} - Campamento ICLP` : "Campamento ICLP"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="header">
        <div className="container nav">
          <strong>Campamento ICLP</strong>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/">Inicio</Link>
            <Link href="/inscripcion/paso-1">Inscribirme</Link>
            <Link href="/mi-habitacion">Mi habitación</Link>
            <Link href="/checkin">Check-in</Link>
          </div>
        </div>
      </header>

      <main className="container">{children}</main>

      <footer className="container" style={{ paddingBottom: 30 }}>
        <small>© {new Date().getFullYear()} Campamento ICLP</small>
      </footer>
    </>
  );
}
