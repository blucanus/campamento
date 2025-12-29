import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Registro() {
  const { query } = useRouter();
  const id = String(query.id || "");
  const [reg, setReg] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch("/api/admin/registration?id=" + id).then(r=>r.json()).then(setReg);
  }, [id]);

  async function save(attId: string, lodging: any) {
    await fetch("/api/admin/assign-lodging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: id, attendeeId: attId, lodging })
    });
    const fresh = await fetch("/api/admin/registration?id=" + id).then(r=>r.json());
    setReg(fresh);
  }

  if (!reg) return <Layout title="Registro"><div className="card">Cargando...</div></Layout>;

  return (
    <Layout title="Detalle inscripción">
      <div className="card">
        <h2>{reg.primary?.name}</h2>
        <p><b>Tel:</b> {reg.primary?.phone} | <b>Email:</b> {reg.primary?.email || "-"}</p>
        <p><b>Pago:</b> {reg.payment?.status}</p>
      </div>

      <div className="card">
        <h3>Integrantes</h3>
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>DNI</th><th>Edad</th><th>Relación</th><th>Dieta</th><th>Sexo</th><th>Habitación</th><th>Cama</th><th>Guardar</th>
            </tr>
          </thead>
          <tbody>
            {reg.attendees.map((a: any) => (
              <Row key={a._id} a={a} onSave={(lodging:any)=>save(a._id, lodging)} />
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function Row({ a, onSave }: { a: any; onSave: (l: any)=>void }) {
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
        <input value={room} onChange={e=>setRoom(e.target.value)} placeholder="Ej: H3 / Dpto 2" />
        <div style={{ marginTop: 6 }}>
          <select value={type} onChange={e=>setType(e.target.value)}>
            <option value="none">Sin asignar</option>
            <option value="bunk">Cucheta</option>
            <option value="dept">Departamento</option>
          </select>
        </div>
      </td>
      <td>
        <select value={bed} onChange={e=>setBed(e.target.value)} disabled={type !== "bunk"}>
          <option value="none">-</option>
          <option value="arriba">Arriba</option>
          <option value="abajo">Abajo</option>
        </select>
      </td>
      <td>
        <button className="btn" type="button" onClick={()=>onSave({ type, room, bed: type==="bunk"? bed : "none" })}>
          Guardar
        </button>
      </td>
    </tr>
  );
}
