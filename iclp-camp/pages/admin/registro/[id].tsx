import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import { ToastHost, useToast } from "@/components/Toast";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

function AdminTabsMini() {
  const Item = ({ href, label }: any) => (
    <a
      href={href}
      style={{
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        fontWeight: 800,
        fontSize: 13
      }}
    >
      {label}
    </a>
  );
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <Item href="/admin" label="Inscripciones" />
      <Item href="/admin/merch" label="Merch" />
      <Item href="/admin/reportes" label="Reportes" />
    </div>
  );
}

export default function Registro() {
  const { query, back } = useRouter();
  const id = String(query.id || "");
  const [reg, setReg] = useState<any>(null);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const toast = useToast();

  async function load() {
    const r = await fetch("/api/admin/registration?id=" + id);
    const j = await r.json();
    setReg(j);
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(attId: string, lodging: any) {
    await fetch("/api/admin/assign-lodging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: id, attendeeId: attId, lodging })
    });
    await load();
    toast.show("✅ Hospedaje guardado", "success");
  }

  const primaryName = useMemo(() => {
    if (!reg) return "";
    return (
      reg.primary?.name ||
      `${reg.step1?.primaryFirstName || ""} ${reg.step1?.primaryLastName || ""}`.trim() ||
      "-"
    );
  }, [reg]);

  const phone = useMemo(() => {
    if (!reg) return "-";
    return reg.primary?.phone || reg.step1?.phone || reg.step1?.tel || "-";
  }, [reg]);

  const email = useMemo(() => {
    if (!reg) return "-";
    return reg.primary?.email || reg.step1?.email || "-";
  }, [reg]);

  const attendanceLabel = useMemo(() => {
    if (!reg) return "Sin datos";

    const optionDays = String(reg.step1?.optionDays || "");
    const daysDetail = String(
      reg.step1?.daysDetail || reg.step1?.oneDay || reg.step1?.twoDays || ""
    );

    const oneDayMap: Record<string, string> = {
      viernes: "Viernes",
      sabado: "Sábado",
      domingo: "Domingo"
    };

    const twoDaysMap: Record<string, string> = {
      "viernes-sabado": "Viernes + Sábado",
      "sabado-domingo": "Sábado + Domingo"
    };

    if (optionDays === "full") return "Todo el campa";
    if (optionDays === "1") {
      const dayLabel = oneDayMap[daysDetail];
      return dayLabel ? `1 día (${dayLabel})` : "1 día";
    }
    if (optionDays === "2") {
      const comboLabel = twoDaysMap[daysDetail];
      return comboLabel ? `2 días (${comboLabel})` : "2 días";
    }

    return "Sin datos";
  }, [reg]);

  const hasExtras = Array.isArray(reg?.extras) && reg.extras.length > 0;

  async function toggleDelivered() {
    if (!reg || !hasExtras) return;

    const next = !reg.extrasDelivered;

    // ✅ Optimistic UI
    setReg((prev: any) => ({
      ...prev,
      extrasDelivered: next,
      extrasDeliveredAt: next ? new Date().toISOString() : null
    }));

    setSavingDelivery(true);

    try {
      const r = await fetch("/api/admin/toggle-extras-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: reg._id, delivered: next })
      });
      const j = await r.json();

      setReg((prev: any) => ({
        ...prev,
        extrasDelivered: j.extrasDelivered,
        extrasDeliveredAt: j.extrasDeliveredAt,
        extrasDeliveredBy: j.extrasDeliveredBy
      }));

      toast.show(next ? "✅ Marcado como ENTREGADO" : "↩️ Marcado como NO entregado", "success");
      await load();
    } catch {
      // rollback
      setReg((prev: any) => ({
        ...prev,
        extrasDelivered: !next
      }));
      toast.show("❌ No se pudo guardar", "danger");
    } finally {
      setSavingDelivery(false);
    }
  }

  async function copyPayLink() {
    const link = String(reg?.payment?.initPoint || "");
    if (!link) {
      toast.show("No hay link de pago guardado.", "danger");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      toast.show("📋 Link de pago copiado", "success");
    } catch {
      // fallback viejo
      const ok = window.prompt("Copiá el link:", link);
      if (ok !== null) toast.show("📋 Link listo para copiar", "success");
    }
  }

  async function refreshPaymentStatus() {
    if (!reg?._id) return;

    setCheckingPayment(true);
    try {
      const r = await fetch("/api/admin/refresh-payment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "registration", id: reg._id })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo comprobar estado");

      setReg((prev: any) => ({
        ...prev,
        payment: {
          ...(prev?.payment || {}),
          status: j.status || prev?.payment?.status,
          paymentId: j.paymentId || prev?.payment?.paymentId,
          lastEventAt: j.lastEventAt || prev?.payment?.lastEventAt
        }
      }));

      toast.show(
        j.changed ? "Estado de pago actualizado" : "Sin cambios en el estado de pago",
        "success"
      );
    } catch {
      toast.show("No se pudo comprobar estado de pago", "danger");
    } finally {
      setCheckingPayment(false);
    }
  }

  const showCopyPay =
    !!reg?.payment?.initPoint &&
    String(reg?.payment?.status || "").toLowerCase() !== "approved";

  const startedAtLabel = reg?.createdAt
    ? new Date(reg.createdAt).toLocaleString("es-AR")
    : "-";
  const mpOperationNumber = String(reg?.payment?.paymentId || "").trim() || "-";

  if (!reg) {
    return (
      <Layout title="Detalle inscripción">
        <div className="card">Cargando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Detalle inscripción">
      <ToastHost toast={toast.toast} onClose={toast.close} />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>{primaryName}</h2>
            <div style={{ opacity: 0.85, marginBottom: 10 }}>
              <b>Tel:</b> {phone} &nbsp;|&nbsp; <b>Email:</b> {email}
            </div>
            <div style={{ opacity: 0.85, marginBottom: 10 }}>
              <b>Inicio inscripcion:</b> {startedAtLabel} &nbsp;|&nbsp; <b>Nro operacion MP:</b> {mpOperationNumber}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span><b>Pago:</b></span>
              <Badge tone={paymentStatusTone(reg.payment?.status)}>
                {paymentStatusLabel(reg.payment?.status)}
              </Badge>

              <span><b>Asistencia:</b></span>
              <Badge tone="muted">{attendanceLabel}</Badge>

              {hasExtras ? (
                reg.extrasDelivered ? (
                  <Badge tone="success">✅ Productos entregados</Badge>
                ) : (
                  <Badge tone="warning">⏳ Productos pendientes</Badge>
                )
              ) : (
                <Badge tone="muted">Sin productos</Badge>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <AdminTabsMini />

            <button className="btn secondary" type="button" onClick={() => back()}>
              ← Volver
            </button>

            <button
              className="btn secondary"
              type="button"
              onClick={refreshPaymentStatus}
              disabled={checkingPayment}
            >
              {checkingPayment ? "Comprobando..." : "Comprobar estado"}
            </button>

            {showCopyPay ? (
              <button className="btn secondary" type="button" onClick={copyPayLink}>
                📋 Copiar link de pago
              </button>
            ) : null}

            {hasExtras ? (
              <button className="btn" type="button" onClick={toggleDelivered} disabled={savingDelivery}>
                {savingDelivery ? "Guardando..." : reg.extrasDelivered ? "Marcar NO entregadas" : "Marcar entregadas"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Productos</h3>

        {hasExtras ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th>SKU</th>
                  <th>Cant.</th>
                  <th>$ Unit</th>
                  <th>$ Total</th>
                </tr>
              </thead>
              <tbody>
                {reg.extras.map((x: any, i: number) => {
                  const label =
                    `${x.attributes?.design || ""} - ${x.attributes?.color || ""}` +
                    (x.attributes?.size ? ` - ${x.attributes.size}` : "");
                  const unit = Number(x.unitPrice || 0);
                  const qty = Number(x.qty || 0);

                  return (
                    <tr key={i}>
                      <td>{x.name || "-"}</td>
                      <td>{label || "-"}</td>
                      <td>{x.sku || "-"}</td>
                      <td>{qty}</td>
                      <td>${unit.toLocaleString("es-AR")}</td>
                      <td>${(unit * qty).toLocaleString("es-AR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ opacity: 0.8 }}>No se compraron productos.</p>
        )}
      </div>

      {/* Integrantes */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Integrantes</h3>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Nombre</th><th>DNI</th><th>Edad</th><th>Relación</th><th>Sexo</th><th>Autorización</th>
                <th>Habitación</th><th>Cama</th><th>Guardar</th>

              </tr>
            </thead>
            <tbody>
              {reg.attendees.map((a: any) => (
                <Row key={a._id} a={a} onSave={(lodging: any) => save(a._id, lodging)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function Row({ a, onSave }: { a: any; onSave: (l: any) => void }) {
  const [type, setType] = useState(a.lodging?.type || "none");
  const [room, setRoom] = useState(a.lodging?.room || "");
  const [bed, setBed] = useState(a.lodging?.bed || "none");

  const consentNeeded = a.age >= 15 && a.age <= 18;

  return (
    <tr>
      <td>{a.firstName} {a.lastName}{a.isPrimary ? " (Principal)" : ""}</td>
      <td>{a.dni}</td>
      <td>{a.age}</td>
      <td>{a.relation}</td>
      <td>{a.sex}</td>

      {/* ✅ Autorización */}
      <td>
        {consentNeeded ? (
          a.consentUrl ? (
            <a className="btn secondary" href={a.consentUrl} target="_blank" rel="noreferrer">
              Ver archivo
            </a>
          ) : (
            <span style={{ fontWeight: 800, color: "#b91c1c" }}>Falta</span>
          )
        ) : (
          <span style={{ opacity: 0.7 }}>—</span>
        )}
      </td>

      <td>
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Ej: H3 / Dpto 2" />
        <div style={{ marginTop: 6 }}>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="none">Sin asignar</option>
            <option value="bunk">Cucheta</option>
            <option value="dept">Departamento</option>
          </select>
        </div>
      </td>

      <td>
        <select value={bed} onChange={e => setBed(e.target.value)} disabled={type !== "bunk"}>
          <option value="none">-</option>
          <option value="arriba">Arriba</option>
          <option value="abajo">Abajo</option>
        </select>
      </td>

      <td>
        <button className="btn" type="button" onClick={() => onSave({ type, room, bed: type === "bunk" ? bed : "none" })}>
          Guardar
        </button>
      </td>
    </tr>
  );
}


