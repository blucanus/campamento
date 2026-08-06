import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import Link from "next/link";
import { useEffect, useState } from "react";

type InviteRow = {
  code: string;
  note: string;
  isActive: boolean;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
  link: string;
};

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return "Error";
}

export default function Accesos() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresDays, setExpiresDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState("");

  async function loadInvites() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/registration-settings");
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(String(j.error || "No se pudieron cargar los codigos"));
      setInvites(Array.isArray(j.invites) ? (j.invites as InviteRow[]) : []);
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "No se pudieron cargar los codigos");
    } finally {
      setLoading(false);
    }
  }

  async function createInvite() {
    setCreating(true);
    try {
      const r = await fetch("/api/admin/registration-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_invite", note, maxUses, expiresDays })
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(String(j.error || "No se pudo generar el codigo"));

      const inviteObj =
        typeof j.invite === "object" && j.invite ? (j.invite as { link?: unknown }) : {};
      const link = String(inviteObj.link || "");
      setLastLink(link);
      if (link) {
        try {
          await navigator.clipboard.writeText(link);
        } catch {
          // noop
        }
      }

      setNote("");
      await loadInvites();
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "No se pudo generar el codigo");
    } finally {
      setCreating(false);
    }
  }

  async function deactivateInvite(code: string) {
    if (!confirm(`Desactivar codigo ${code}?`)) return;
    try {
      const r = await fetch("/api/admin/registration-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate_invite", code })
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(String(j.error || "No se pudo desactivar"));
      await loadInvites();
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "No se pudo desactivar");
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copiado");
    } catch {
      window.prompt("Copiar:", text);
    }
  }

  useEffect(() => {
    loadInvites();
  }, []);

  return (
    <Layout title="Codigos de excepcion">
      <div className="card">
        <div className="row-between">
          <div>
            <h2 style={{ marginBottom: 4 }}>Links de excepcion</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              Sirven para inscribir a alguien puntual aunque las inscripciones esten cerradas.
            </div>
          </div>
          <Link className="btn secondary" href="/admin">
            Volver a inscripciones
          </Link>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Generar un link nuevo</h3>

        <div className="formGrid">
          <div>
            <label>Nota interna (opcional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Familia Perez" />
          </div>
          <div>
            <label>Vence en dias (0 = sin vencimiento)</label>
            <input
              type="number"
              min={0}
              max={365}
              value={expiresDays}
              onChange={(e) => setExpiresDays(Number(e.target.value || 0))}
            />
          </div>
          <div>
            <label>Cantidad de usos</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value || 1))}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" type="button" onClick={createInvite} disabled={creating}>
            {creating ? "Generando..." : "Generar codigo y link"}
          </button>
          {lastLink ? (
            <button className="btn secondary" type="button" onClick={() => copyText(lastLink)}>
              Copiar ultimo link
            </button>
          ) : null}
        </div>

        {lastLink ? (
          <div className="fieldHint" style={{ wordBreak: "break-all" }}>
            Ultimo link generado: <code>{lastLink}</code>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Codigos generados</h3>
          <button className="btn secondary sm" type="button" onClick={loadInvites} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nota</th>
                <th>Uso</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invites.map((x) => (
                <tr key={x.code}>
                  <td><code>{x.code}</code></td>
                  <td>{x.note || "-"}</td>
                  <td>{x.usedCount}/{x.maxUses}</td>
                  <td>{x.expiresAt ? new Date(x.expiresAt).toLocaleString("es-AR") : "Sin vencimiento"}</td>
                  <td>
                    <Badge tone={x.isActive ? "success" : "muted"}>
                      {x.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td>
                    <button className="btn secondary sm" type="button" onClick={() => copyText(x.link)}>
                      Copiar link
                    </button>
                  </td>
                  <td>
                    {x.isActive ? (
                      <button
                        className="btn secondary sm"
                        type="button"
                        onClick={() => deactivateInvite(x.code)}
                      >
                        Desactivar
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}

              {!invites.length ? (
                <tr>
                  <td colSpan={7} className="muted">No hay codigos generados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
