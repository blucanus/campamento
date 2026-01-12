import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Layout({ title, children }: { title?: string; children: any }) {
  const { pathname } = useRouter();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      <Head>
        <title>{title ? `${title} - Campamento ICLP` : "Campamento ICLP"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="header">
        <div className="container nav" style={{ justifyContent: "space-between" }}>
          <strong>🏕️ Campamento ICLP</strong>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/">Inicio</Link>
            <Link href="/inscripcion/paso-1">Inscribirme</Link>
            <Link href="/mi-habitacion">Mi habitación</Link>
            <Link href="/checkin">Check-in</Link>

            {isAdmin && (
              <>
                <span style={{ opacity: 0.4 }}>|</span>
                <Link href="/admin">Admin</Link>
                <Link href="/admin/reportes">Reportes</Link>
                <Link href="/inscripcion/paso-1?admin=1">
                  <b>➕ Inscribir</b>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 20 }}>
        {children}
      </main>

      <footer className="container" style={{ paddingBottom: 30, marginTop: 30 }}>
        <small>© {new Date().getFullYear()} Campamento ICLP</small>
      </footer>
    </>
  );
}
