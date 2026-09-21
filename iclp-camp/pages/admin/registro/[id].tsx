import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { dietRestrictionsLabel } from "@/lib/pure";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import { ToastHost, useToast } from "@/components/Toast";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export default function Registro() {
  const { query, back } = useRouter();
  const id = String(query.id || "");
  const [reg, setReg] = useState<any>(null);
  const [role, setRole] = useState("");
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [busySuper, setBusySuper] = useState(false);
  const toast = useToast();

  const isSuper = role === "superadmin";

  async function load() {
    const [rm, r] = await Promise.all([
      fetch("/api/admin/me"),
      fetch("/api/admin/registration?id=" + id)
    ]);
    const me = await rm.json().catch(() => ({}));
    setRole(String(me?.admin?.role || ""));
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
      if (!r.ok) {
        const msg = j?.details || j?.error || "No se pudo comprobar estado";
        throw new Error(String(msg));
      }

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
    } catch (e: any) {
      toast.show(e?.message || "No se pudo comprobar estado de pago", "danger");
    } finally {
      setCheckingPayment(false);
    }
  }

  async function adjustDays(optionDays: string, daysDetail: string) {
    setBusySuper(true);
    try {
      const r = await fetch("/api/admin/adjust-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: reg._id, optionDays, daysDetail })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "No se pudo modificar");

      await load();

      if (j.due > 0) {
        toast.show(
          `Nuevo total $${Number(j.totalAfter).toLocaleString("es-AR")}. Falta cobrar $${Number(j.due).toLocaleString("es-AR")}.`,
          "success"
        );
      } else if (j.credit > 0) {
        toast.show(
          `Nuevo total $${Number(j.totalAfter).toLocaleString("es-AR")}. Quedan $${Number(j.credit).toLocaleString("es-AR")} a favor: devolvelos a mano.`,
          "success"
        );
      } else {
        toast.show("Días actualizados. No hay diferencia a cobrar.", "success");
      }
    } catch (e: any) {
      toast.show(e?.message || "No se pudo modificar", "danger");
    } finally {
      setBusySuper(false);
    }
  }

  async function refundRegistration(scope: "all" | "camp") {
    const question =
      scope === "camp"
        ? "¿Cancelar la inscripción y devolver SOLO el campa? Los productos quedan pagos y hay que entregarlos. No se puede deshacer."
        : "¿Cancelar la inscripción y devolver todo el pago por Mercado Pago? No se puede deshacer.";
    if (!window.confirm(question)) return;

    setBusySuper(true);
    try {
      const r = await fetch("/api/admin/refund-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: reg._id, scope })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "No se pudo devolver el pago");

      await load();
      toast.show(
        `Inscripción cancelada. Devuelto $${Number(j.amount || 0).toLocaleString("es-AR")}.`,
        "success"
      );
    } catch (e: any) {
      toast.show(e?.message || "No se pudo devolver el pago", "danger");
    } finally {
      setBusySuper(false);
    }
  }

  const payStatus = String(reg?.payment?.status || "").toLowerCase();
  const chargeable = payStatus !== "approved" && payStatus !== "refunded";
  const showCopyPay = !!reg?.payment?.initPoint && chargeable;

  const startedAtLabel = reg?.createdAt
    ? new Date(reg.createdAt).toLocaleString("es-AR")
    : "-";
  const mpOperationNumber = String(reg?.payment?.paymentId || "").trim() || "-";

  const paidAtLabel =
    String(reg?.payment?.status || "").toLowerCase() === "approved" && reg?.payment?.lastEventAt
      ? new Date(reg.payment.lastEventAt).toLocaleString("es-AR")
      : "-";
  const accessCodeLabel = String(reg?.accessCodeUsed || "").trim() || "-";

  const totalARS = Number(reg?.total || 0);
  const refundedARS = Number(reg?.payment?.refundedAmount || 0);
  // Las inscripciones viejas no guardan lo cobrado: si esta aprobada, pago lo que vale hoy.
  const paidARS = Number(reg?.payment?.paidAmount || 0) || (payStatus === "approved" ? totalARS : 0);
  const money = (n: number) => `$${Number(n || 0).toLocaleString("es-AR")}`;

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
            <div style={{ opacity: 0.85, marginBottom: 10 }}>
              <b>Fecha de pago:</b> {paidAtLabel} &nbsp;|&nbsp; <b>Codigo usado:</b> {accessCodeLabel}
            </div>
            <div style={{ opacity: 0.85, marginBottom: 10 }}>
              <b>Total:</b> {money(totalARS)} &nbsp;|&nbsp;{" "}
              {payStatus === "refunded" ? (
                <>
                  <b>Devuelto:</b> {refundedARS > 0 ? money(refundedARS) : "sin dato"}
                  {reg?.payment?.refundScope === "camp"
                    ? ` (solo el campa; productos pagos: ${money(paidARS)})`
                    : ""}
                </>
              ) : (
                <>
                  <b>Pagado:</b> {money(paidARS)}
                  {paidARS > 0 && paidARS < totalARS ? ` (falta ${money(totalARS - paidARS)})` : ""}
                </>
              )}
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

            {chargeable ? (
              <a className="btn secondary" href={`/staff/cobrar/${reg._id}`}>
                💳 Cobrar (QR / posnet)
              </a>
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
          <div className="tableWrap">
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

      {/* Solo superadmin: cambiar dias / cancelar */}
      {isSuper ? (
        <SuperAdminCard reg={reg} busy={busySuper} onAdjust={adjustDays} onRefund={refundRegistration} hasExtras={hasExtras} />
      ) : null}

      {/* Integrantes */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Integrantes</h3>

        <div className="tableWrap">
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Nombre</th><th>DNI</th><th>Edad</th><th>Relación</th><th>Sexo</th><th>Dieta</th><th>Autorización</th>
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

function SuperAdminCard({
  reg,
  busy,
  onAdjust,
  onRefund,
  hasExtras
}: {
  reg: any;
  busy: boolean;
  onAdjust: (optionDays: string, daysDetail: string) => void;
  onRefund: (scope: "all" | "camp") => void;
  hasExtras: boolean;
}) {
  const [optionDays, setOptionDays] = useState(String(reg.step1?.optionDays || "full"));
  const [oneDay, setOneDay] = useState(String(reg.step1?.oneDay || reg.step1?.daysDetail || "sabado"));
  const [twoDays, setTwoDays] = useState(
    String(reg.step1?.twoDays || reg.step1?.daysDetail || "viernes-sabado")
  );

  const status = String(reg.payment?.status || "").toLowerCase();
  const detail = optionDays === "1" ? oneDay : optionDays === "2" ? twoDays : "";

  return (
    <div className="card" style={{ marginTop: 12, borderLeft: "4px solid #b91c1c" }}>
      <h3>Solo superadmin</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <span><b>Días:</b></span>

        <select value={optionDays} onChange={(e) => setOptionDays(e.target.value)}>
          <option value="1">1 día</option>
          <option value="2">2 días</option>
          <option value="full">Todo el campa</option>
        </select>

        {optionDays === "1" ? (
          <select value={oneDay} onChange={(e) => setOneDay(e.target.value)}>
            <option value="viernes">Viernes</option>
            <option value="sabado">Sábado</option>
            <option value="domingo">Domingo</option>
          </select>
        ) : null}

        {optionDays === "2" ? (
          <select value={twoDays} onChange={(e) => setTwoDays(e.target.value)}>
            <option value="viernes-sabado">Viernes + Sábado</option>
            <option value="sabado-domingo">Sábado + Domingo</option>
          </select>
        ) : null}

        <button className="btn" type="button" disabled={busy || status === "refunded"} onClick={() => onAdjust(optionDays, detail)}>
          {busy ? "Guardando..." : "Modificar y cobrar diferencia"}
        </button>
      </div>

      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Si el nuevo total es mayor, la inscripción vuelve a quedar pendiente y el QR / posnet / link
        cobran solo la diferencia.
      </p>

      <hr style={{ margin: "14px 0", opacity: 0.2 }} />

      {status === "refunded" ? (
        <p style={{ fontWeight: 800, color: "#b91c1c" }}>
          Cancelada y devuelta{reg.payment?.refundScope === "camp" ? " (solo el campa)" : ""}
          {reg.payment?.refundedBy ? ` por ${reg.payment.refundedBy}` : ""}.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn danger"
            type="button"
            disabled={busy || status !== "approved"}
            onClick={() => onRefund("all")}
          >
            {busy ? "Procesando..." : "Cancelar y devolver todo"}
          </button>

          {hasExtras ? (
            <button
              className="btn danger"
              type="button"
              disabled={busy || status !== "approved"}
              onClick={() => onRefund("camp")}
              title="Devuelve solo el campa: los productos quedan pagos y hay que entregarlos"
            >
              {busy ? "Procesando..." : "Cancelar y devolver solo el campa"}
            </button>
          ) : null}
        </div>
      )}

      {status !== "approved" && status !== "refunded" ? (
        <p style={{ opacity: 0.8, marginTop: 8 }}>Solo se puede devolver una inscripción paga.</p>
      ) : null}
    </div>
  );
}

function Row({ a, onSave }: { a: any; onSave: (l: any) => void }) {
  const [type, setType] = useState(a.lodging?.type || "none");
  const [room, setRoom] = useState(a.lodging?.room || "");
  const [bed, setBed] = useState(a.lodging?.bed || "none");

  const consentNeeded = a.age >= 15 && a.age <= 18;
  const dieta = dietRestrictionsLabel(a.dietaryRestrictions);

  return (
    <tr>
      <td>{a.firstName} {a.lastName}{a.isPrimary ? " (Principal)" : ""}</td>
      <td>{a.dni}</td>
      <td>{a.age}</td>
      <td>{a.relation}</td>
      <td>{a.sex}</td>

      {/* ✅ Dieta: quien tiene restricciones no come del menu base */}
      <td>
        {dieta ? (
          <span className="badge warning">{dieta}</span>
        ) : (
          <span style={{ opacity: 0.7 }}>Base</span>
        )}
      </td>

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

