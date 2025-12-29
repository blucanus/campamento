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
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error || "Error");
      return;
    }
    router.push("/admin");
  }

  return (
    <Layout title="Admin login">
      <div className="card">
        <h2>Login Admin</h2>
        {err && <div className="alert">{err}</div>}
        <form onSubmit={submit} className="grid2">
          <div>
            <label>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label>Clave</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} required />
          </div>
          <button className="btn">Entrar</button>
        </form>
      </div>
    </Layout>
  );
}
