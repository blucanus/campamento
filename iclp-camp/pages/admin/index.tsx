import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
type RegistrationRow = {
  _id: string;
  primary?: { name?: string; phone?: string };
  attendees?: unknown[];
  hasExtras?: boolean;
  extrasDelivered?: boolean;
  payment?: { status?: string; lastEventAt?: string; initPoint?: string };
  createdAt?: string;
  accessCodeUsed?: string;
};
type PaymentFilter = "todas" | "approved" | "pending";

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return "Error";
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-AR");
}

export default function Admin() {
  const [data, setData] = useState<RegistrationRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresDays, setExpiresDays] = useState(7);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [lastLink, setLastLink] = useState("");

  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todas");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const url = q ? `/api/admin/registrations?q=${encodeURIComponent(q)}` : `/api/admin/registrations`;
    const r = await fetch(url);
    const j = await r.json();
    setData(Array.isArray(j) ? j : []);
    setSelected([]);
    setLoading(false);
  }, [q]);

  const visible = data.filter((r) => {
    const status = String(r.payment?.status || "pending").toLowerCase();
    if (paymentFilter === "approved") return status === "approved";
    if (paymentFilter === "pending") return status !== "approved";
    return true;
  });

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function removeRegistrations(purgePending: boolean) {
    const count = purgePending
      ? visible.filter((r) => String(r.payment?.status || "").toLowerCase() !== "approved").length
      : selected.length;

    if (!purgePending && !count) {
      alert("No seleccionaste ninguna inscripción.");
      return;
    }
    if (!confirm(purgePending ? "¿Eliminar TODAS las inscripciones sin pago aprobado?" : `¿Eliminar ${count} inscripción(es)?`)) {
      return;
    }

    setDeleting(true);
    try {
      const r = await fetch("/api/admin/delete-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(purgePending ? { purgePending: true } : { ids: selected })
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(String(j.error || "No se pudo eliminar"));
      alert(`Eliminadas: ${Number(j.deleted || 0)}`);
      await load();
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  }

  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const r = await fetch("/api/admin/registration-settings");
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(String(j.error || "No se pudieron cargar los ajustes"));
      setRegistrationsOpen(Boolean(j.registrationsOpen));
      setInvites(Array.isArray(j.invites) ? (j.invites as InviteRow[]) : []);
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "No se pudieron cargar los ajustes");
    } finally {
      setSettingsLoading(false);
    }
  }

  async function updateOpen(nextOpen: boolean) {
    setSettingsLoading(true);
    try {
      const r = await fetch("/api/admin/registration-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_open", open: nextOpen })
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(String(j.error || "No se pudo guardar"));
      setRegistrationsOpen(Boolean(j.registrationsOpen));
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "No se pudo guardar");
    } finally {
      await loadSettings();
    }
  }

  async function createInvite() {
    setCreatingInvite(true);
    try {
      const r = await fetch("/api/admin/registration-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_invite",
          note,
          maxUses,
          expiresDays
        })
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(String(j.error || "No se pudo generar el codigo"));

      const inviteObj =
        typeof j.invite === "object" && j.invite
          ? (j.invite as { link?: unknown })
          : {};
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
      await loadSettings();
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "No se pudo generar el codigo");
    } finally {
      setCreatingInvite(false);
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
      await loadSettings();
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
    load();
  }, [load]);

  useEffect(() => {
    loadSettings();
  }, []);

  // El staff no entra al admin: va a su pantalla de secretaría.
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/me");
      if (r.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (j?.admin?.role === "staff") window.location.href = "/staff";
    })();
  }, []);

  return (
    <Layout title="Admin">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Admin</h2>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {loading ? "Cargando..." : `${data.length} registros`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link className="btn" href="/inscripcion/paso-1?admin=1">➕ Inscribir</Link>
            <Link className="btn secondary" href="/staff">💳 Staff</Link>
            <Link className="btn" href="/merch">➕ Comprar MERCH</Link>
            <Link className="btn secondary" href="/api/admin/export?format=csv">CSV</Link>
            <Link className="btn secondary" href="/api/admin/export?format=xlsx">Excel</Link>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Buscar por nombre, email, tel o DNI..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ width: 360, maxWidth: "100%" }}
            />
            <button className="btn secondary" onClick={load} type="button">Actualizar</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>Control de inscripciones</h3>
              <div style={{ marginTop: 6 }}>
                Estado actual:{" "}
                <Badge tone={registrationsOpen ? "success" : "warning"}>
                  {registrationsOpen ? "Abiertas" : "Cerradas"}
                </Badge>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                disabled={settingsLoading || registrationsOpen}
                onClick={() => updateOpen(true)}
              >
                Abrir inscripciones
              </button>
              <button
                className="btn secondary"
                type="button"
                disabled={settingsLoading || !registrationsOpen}
                onClick={() => updateOpen(false)}
              >
                Cerrar inscripciones
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Generar link unico de excepcion</h4>
            <div className="grid2">
              <div>
                <label>Nota interna (opcional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Familia Perez"
                />
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
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" type="button" onClick={createInvite} disabled={creatingInvite}>
                {creatingInvite ? "Generando..." : "Generar codigo y link"}
              </button>
              {lastLink ? (
                <button className="btn secondary" type="button" onClick={() => copyText(lastLink)}>
                  Copiar ultimo link
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 14, width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%" }}>
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
                      <button className="btn secondary" type="button" onClick={() => copyText(x.link)}>
                        Copiar link
                      </button>
                    </td>
                    <td>
                      {x.isActive ? (
                        <button
                          className="btn secondary"
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
                    <td colSpan={7} style={{ opacity: 0.7 }}>No hay codigos generados.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ margin: 0 }}>Pago:</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              style={{ width: 200 }}
            >
              <option value="todas">Todas</option>
              <option value="approved">Solo pagadas</option>
              <option value="pending">Sin pagar</option>
            </select>
            <span style={{ opacity: 0.75, fontSize: 13 }}>{visible.length} visibles</span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn secondary"
              type="button"
              onClick={() => removeRegistrations(false)}
              disabled={deleting || !selected.length}
            >
              🗑️ Eliminar seleccionadas ({selected.length})
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => removeRegistrations(true)}
              disabled={deleting}
            >
              🧹 Eliminar todas las que no pagaron
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th></th>
                <th>Principal</th>
                <th>Tel</th>
                <th>Personas</th>
                <th>Inscripción</th>
                <th>Pago</th>
                <th>Código</th>
                <th>Productos</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(r._id)}
                      onChange={() => toggleSelected(r._id)}
                      aria-label="Seleccionar inscripción"
                    />
                  </td>
                  <td style={{ fontWeight: 800 }}>{r.primary?.name}</td>
                  <td>{r.primary?.phone || "-"}</td>
                  <td>{r.attendees?.length || 0}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.createdAt)}</td>
                  <td style={{ fontSize: 12 }}>
                    {String(r.payment?.status || "").toLowerCase() === "approved"
                      ? fmtDate(r.payment?.lastEventAt)
                      : "—"}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.accessCodeUsed ? <code>{r.accessCodeUsed}</code> : "—"}
                  </td>
                  <td>{r.hasExtras ? <Badge tone="muted">🛍️ Sí</Badge> : "—"}</td>
                  <td>
                    {r.hasExtras ? (
                      r.extrasDelivered ? <Badge tone="success">✅ Entregado</Badge> : <Badge tone="warning">⏳ Pendiente</Badge>
                    ) : "—"}
                  </td>
                  <td>
                    <Badge tone={paymentStatusTone(r.payment?.status)}>
                      {paymentStatusLabel(r.payment?.status)}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a className="btn secondary" href={`/admin/registro/${r._id}`}>Ver</a>
                      {r.payment?.initPoint && String(r.payment?.status || "").toLowerCase() !== "approved" ? (
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => copyText(String(r.payment?.initPoint || ""))}
                        >
                          📋 Pago
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!visible.length && !loading && (
                <tr>
                  <td colSpan={11} style={{ opacity: 0.7 }}>No hay resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
