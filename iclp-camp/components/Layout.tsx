import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };

const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/inscripcion/paso-1", label: "Inscribirme" },
  { href: "/merch", label: "Merch" },
  { href: "/mi-habitacion", label: "Mi habitación" },
  { href: "/checkin", label: "Check-in" }
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Inscripciones" },
  { href: "/admin/merch", label: "Merch" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/staff", label: "Staff" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/campa", label: "Campa" },
  { href: "/checkin", label: "Check-in" }
];

const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "Staff" },
  { href: "/checkin", label: "Check-in" }
];

export default function Layout({ title, children }: { title?: string; children: any }) {
  const { pathname } = useRouter();
  const [role, setRole] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // El panel (admin + staff) usa siempre el mismo menu; el login no lo muestra.
  const isPanel =
    (pathname.startsWith("/admin") || pathname.startsWith("/staff")) &&
    pathname !== "/admin/login";

  useEffect(() => {
    if (!isPanel) return;
    (async () => {
      const r = await fetch("/api/admin/me");
      if (!r.ok) return;
      const j = await r.json().catch(() => ({}));
      setRole(String(j?.admin?.role || ""));
    })();
  }, [isPanel]);

  const isStaffOnly = role === "staff";
  const nav = !isPanel ? PUBLIC_NAV : isStaffOnly ? STAFF_NAV : ADMIN_NAV;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  return (
    <>
      <Head>
        <title>{title ? `${title} - Campamento ICLP` : "Campamento ICLP"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2f5d50" />
      </Head>

      <div className="app-shell">
        <header className="header">
          <div className="container nav">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href={isPanel ? "/admin" : "/"} className="nav-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="nav-logo" src="/logo.png" alt="" />
                <span>Campamento ICLP</span>
              </Link>

              {isPanel ? <span className="nav-tag">{isStaffOnly ? "Staff" : "Admin"}</span> : null}
            </div>

            <button
              className="nav-toggle"
              type="button"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
            </button>

            {/* Al tocar cualquier item cerramos el menu mobile. */}
          <nav
            className={menuOpen ? "nav-links is-open" : "nav-links"}
            onClick={() => setMenuOpen(false)}
          >
              {nav.map((x) => (
                <Link
                  key={x.href}
                  href={x.href}
                  className={pathname === x.href ? "nav-link is-active" : "nav-link"}
                >
                  {x.label}
                </Link>
              ))}

              {isPanel ? (
                <>
                  <Link className="btn sm" href="/inscripcion/paso-1?admin=1">
                    Inscribir
                  </Link>
                  <button className="btn sm secondary" type="button" onClick={logout}>
                    Salir
                  </button>
                </>
              ) : (
                <Link className="btn sm" href="/inscripcion/paso-1">
                  Inscribirme
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="container" style={{ paddingTop: 22, paddingBottom: 10 }}>
          {children}
        </main>

        <footer className="site-footer">
          <div className="container site-footer-inner">
            <small>© {new Date().getFullYear()} Campamento ICLP</small>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link href="/">Inicio</Link>
              <Link href="/inscripcion/paso-1">Inscripción</Link>
              <Link href="/merch">Merch</Link>
              <Link href="/checkin">Check-in</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
