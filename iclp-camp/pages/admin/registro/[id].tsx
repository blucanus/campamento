import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export default function Registro() {
  const { query, back } = useRouter();
  const id = String(query.id || "");
  const [reg, setReg] = useState<any>(null);
  const [savingDelivery, setSavingDelivery] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/registration?id=" + id);
    const j = await r.json();
    setReg(j);
  }

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  async function save(attId: string, lodging: any) {
    await fetch("/api/admin/assign-lodging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: id, attendeeId: attId, lodging })
    });
    await load();
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

  async function toggleDelivered() {
    if (!reg) return;
    setSavingDelivery(true);

    try {
      const r = await fetch("/api/admin/toggle-extras-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: reg._id, delivered: !reg.extrasDelivered })
      });
      await r.json();
      await load();

      // feedback visible inmediato
      alert(!reg.extrasDelivered ? "✅ Marcado como ENTREGADO" : "↩️ Marcado como NO entregado");
    } finally {
      setSavingDelivery(false);
    }
  }

  if (!reg) return <Layout title="Registro"><div className="card">Cargando...</div></Layout>;

  const hasExtras = Array.isArray(reg.extras) && reg.extras.length > 0;

  return (
    <Layout title="Detalle inscripción">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>{primaryName}</h2>
            <p style={{ marginTop: 0 }}><b>Tel:</b> {phone} | <b>Email:</b> {email}</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span><b>Pago:</b></span>
              <Badge tone={paymentStatusTone(reg.payment?.status)}>
                {paymentStatusLabel(reg.payment?.status)}
              </Badge>

              {hasExtras ? (
                reg.extrasDelivered ? <Badge tone="success">✅ Productos entregados</Badge> : <Badge tone="warning">⏳ Productos pendientes</Badge>
              ) : (
                <Badge tone="muted">Sin productos</Badge>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn secondary" type="button" onClick={() => back()}>
              ← Volver
            </button>

            {hasExtras ? (
              <button
                className="btn"
                type="button"
                onClick={toggleDelivered}
                disabled={savingDelivery}
              >
                {savingDelivery
                  ? "Guardando..."
                  : reg.extrasDelivered
                    ? "Marcar como NO entregadas"
                    : "Marcar como entregadas"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Productos</h3>

        {hasExtras ? (
          <table>
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
        ) : (
          <p style={{ opacity: 0.8 }}>No se compraron productos.</p>
        )}
      </div>

      {/* Integrantes */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Integrantes</h3>
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>DNI</th><th>Edad</th><th>Relación</th><th>Dieta</th><th>Sexo</th><th>Habitación</th><th>Cama</th><th>Guardar</th>
            </tr>
          </thead>
          <tbody>
            {reg.attendees.map((a: any) => (
              <Row key={a._id} a={a} onSave={(lodging: any) => save(a._id, lodging)} />
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function Row({ a, onSave }: { a: any; onSave: (l: any) => void }) {
  const [type, setType] = useState(a.lodging?.type || "none");
  const [room, setRoom] = useState(a.lodging?.room || "");
  const [bed, setBed] = useState(a.lodging?.bed || "none");

  return (
    <tr>
      <td>{a.firstName} {a.lastName}{a.isPrimary ? " (Principal)" : ""}</td>
      <td>{a.dni}</td>
      <td>{a.age}</td>
      <td>{a.relation}</td>
      <td>{a.diet}</td>
      <td>{a.sex}</td>
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
