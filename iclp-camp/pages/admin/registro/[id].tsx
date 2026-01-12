import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export default function Registro() {
  const { query } = useRouter();
  const id = String(query.id || "");
  const [reg, setReg] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch("/api/admin/registration?id=" + id).then(r => r.json()).then(setReg);
  }, [id]);

  async function save(attId: string, lodging: any) {
    await fetch("/api/admin/assign-lodging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: id, attendeeId: attId, lodging })
    });
    const fresh = await fetch("/api/admin/registration?id=" + id).then(r => r.json());
    setReg(fresh);
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
    return reg.primary?.phone || reg.step1?.phone || "-";
  }, [reg]);

  const email = useMemo(() => {
    if (!reg) return "-";
    return reg.primary?.email || reg.step1?.email || "-";
  }, [reg]);

  if (!reg) return <Layout title="Registro"><div className="card">Cargando...</div></Layout>;

  return (
    <Layout title="Detalle inscripción">
      <div className="card">
        <h2>{primaryName}</h2>
        <p><b>Tel:</b> {phone} | <b>Email:</b> {email}</p>
        <p><b>Pago:</b> {reg.payment?.status}</p>
      </div>

      {/* ✅ Productos */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Productos</h3>

        {Array.isArray(reg.extras) && reg.extras.length ? (
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
