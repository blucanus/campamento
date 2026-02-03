import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import Link from "next/link";

type Me = { admin: { id: string; email: string; role: string } };
type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "admin";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

async function safeJson(r: Response) {
  return r.json().catch(() => ({}));
}

export default function AdminUsers() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // create form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");
  const [pass, setPass] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [rm, ru] = await Promise.all([fetch("/api/admin/me"), fetch("/api/admin/users")]);

      if (rm.status === 401 || ru.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const jm = await safeJson(rm);
      const ju = await safeJson(ru);

      setMe(jm);
      setUsers(Array.isArray(ju) ? ju : []);
    } catch (e: any) {
      setErr(e?.message || "Error cargando");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isSuper = me?.admin?.role === "superadmin";

  async function createUser() {
    setErr(null);
    if (!email || !pass) return alert("Email y clave son obligatorios");

    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role, pass }),
    });

    const j = await safeJson(r);
    if (!r.ok) {
      setErr(j.error || "No se pudo crear");
      return;
    }

    setEmail("");
    setName("");
    setRole("admin");
    setPass("");
    await load();
  }

  async function saveRow(u: UserRow, patch: Partial<UserRow> & { newPass?: string }) {
    setErr(null);
    const r = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: u.id,
        name: patch.name ?? u.name,
        role: patch.role ?? u.role,
        isActive: typeof patch.isActive === "boolean" ? patch.isActive : u.isActive,
        newPass: patch.newPass || "",
      }),
    });

    const j = await safeJson(r);
    if (!r.ok) {
      setErr(j.error || "No se pudo guardar");
      return;
    }
    await load();
  }

  return (
    <Layout title="Admin - Usuarios">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Usuarios</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn secondary" href="/admin">Volver</Link>
            {isSuper ? (
              <Link className="btn secondary" href="/api/admin/audit?limit=50">Ver auditoría (JSON)</Link>
            ) : null}
          </div>
        </div>

        {err ? <div className="alert" style={{ marginTop: 12 }}>{err}</div> : null}

        <p style={{ opacity: 0.85 }}>
          Tu rol: <b>{me?.admin?.role || "-"}</b> — Email: <b>{me?.admin?.email || "-"}</b>
        </p>

        {!isSuper ? (
          <div className="alert">
            Solo el <b>superadmin</b> puede crear/editar usuarios.
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Crear usuario</h3>
            <div className="grid2">
              <div>
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@..." />
              </div>
              <div>
                <label>Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <label>Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label>Clave</label>
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="********" />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <button className="btn" type="button" onClick={createUser} disabled={loading}>
                Crear usuario
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 12 }}>
          <h3>Listado</h3>
          {loading ? <p>Cargando...</p> : null}

          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Activo</th>
                <th>Último login</th>
                <th>Reset clave</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRowComp key={u.id} u={u} canEdit={!!isSuper} onSave={(patch) => saveRow(u, patch)} />
              ))}

              {users.length === 0 ? (
                <tr><td colSpan={7} style={{ opacity: 0.7 }}>No hay usuarios.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function UserRowComp({
  u,
  canEdit,
  onSave,
}: {
  u: UserRow;
  canEdit: boolean;
  onSave: (patch: Partial<UserRow> & { newPass?: string }) => void;
}) {
  const [name, setName] = useState(u.name || "");
  const [role, setRole] = useState<UserRow["role"]>(u.role);
  const [isActive, setIsActive] = useState(!!u.isActive);
  const [newPass, setNewPass] = useState("");

  return (
    <tr>
      <td>{u.email}</td>
      <td>
        <input
          value={name}
          disabled={!canEdit}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 220 }}
        />
      </td>
      <td>
        <select value={role} disabled={!canEdit} onChange={(e) => setRole(e.target.value as any)}>
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
        </select>
      </td>
      <td>
        <input type="checkbox" checked={isActive} disabled={!canEdit} onChange={(e) => setIsActive(e.target.checked)} />
      </td>
      <td style={{ opacity: 0.85 }}>
        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("es-AR") : "-"}
      </td>
      <td>
        <input
          type="password"
          value={newPass}
          disabled={!canEdit}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="Nueva clave"
          style={{ width: 160 }}
        />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {canEdit ? (
          <button
            className="btn"
            type="button"
            onClick={() => {
              onSave({ name, role, isActive, newPass });
              setNewPass("");
            }}
          >
            Guardar
          </button>
        ) : (
          <small style={{ opacity: 0.7 }}>—</small>
        )}
      </td>
    </tr>
  );
}
