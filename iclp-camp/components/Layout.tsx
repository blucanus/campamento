import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };

const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/inscripcion/paso-1", label: "Inscribirme" },
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
      </Head>

      <header className="header">
        <div className="container nav" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <strong style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>🏕️</span> Campamento ICLP
            </strong>

            {isPanel ? <BadgeNav text={isStaffOnly ? "STAFF" : "ADMIN"} /> : null}
          </div>

          <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            {nav.map((x) => (
              <Link
                key={x.href}
                href={x.href}
                style={{ fontWeight: pathname === x.href ? 900 : undefined }}
              >
                {x.label}
              </Link>
            ))}

            {isPanel ? (
              <>
                <Link href="/inscripcion/paso-1?admin=1">
                  <b>➕ Inscribir</b>
                </Link>
                <span style={{ opacity: 0.35 }}>|</span>
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
                  Salir
                </a>
              </>
            ) : null}
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
