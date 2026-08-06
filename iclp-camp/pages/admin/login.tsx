import Layout from "@/components/Layout";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function submit(e: any) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pass })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error || "Error");
      return;
    }
    router.push(j.role === "staff" ? "/staff" : "/admin");
  }

  return (
    <Layout title="Admin login">
      <div style={{ maxWidth: 420, margin: "6vh auto 0" }}>
        <div className="card" style={{ padding: 24 }}>
          <span className="badge info">Panel interno</span>
          <h2 style={{ marginTop: 12 }}>Ingresar</h2>
          <p className="muted" style={{ marginTop: -4 }}>
            Acceso para el equipo de administración y staff.
          </p>

          {err && <div className="alert" style={{ marginBottom: 8 }}>{err}</div>}

          <form onSubmit={submit}>
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              required
            />

            <label>Clave</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={pass}
              onChange={e=>setPass(e.target.value)}
              required
            />

            <button className="btn block lg" style={{ marginTop: 18 }}>Entrar</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
