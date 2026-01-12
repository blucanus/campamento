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
        <div className="container nav" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <strong style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>🏕️</span> Campamento ICLP
            </strong>

            {isAdmin ? (
              <BadgeNav text="ADMIN" />
            ) : null}
          </div>

          <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/">Inicio</Link>
            <Link href="/inscripcion/paso-1">Inscribirme</Link>
            <Link href="/mi-habitacion">Mi habitación</Link>
            <Link href="/checkin">Check-in</Link>

            {isAdmin && (
              <>
                <span style={{ opacity: 0.35 }}>|</span>
                <Link href="/admin">Inscripciones</Link>
                <Link href="/admin/reportes">Reportes</Link>
                <Link href="/inscripcion/paso-1?admin=1">
                  <b>➕ Inscribir</b>
                </Link>
              </>
            )}
          </nav>
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

function BadgeNav({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 1,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(59,130,246,0.18)",
        border: "1px solid rgba(255,255,255,0.14)"
      }}
    >
      {text}
    </span>
  );
}
