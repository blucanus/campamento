import Layout from "@/components/Layout";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Paso1() {
  const router = useRouter();
  const [form, setForm] = useState({
    count: 1,
    optionDays: "full",
    daysDetail: "",
    primaryName: "",
    phone: "",
    email: ""
  });

  function submit(e: any) {
    e.preventDefault();
    localStorage.setItem("step1", JSON.stringify(form));
    router.push("/inscripcion/paso-2");
  }

  return (
    <Layout title="Inscripción – Paso 1">
      <div className="card">
        <h2>Paso 1 – Grupo y días</h2>

        <form onSubmit={submit} className="grid2">
          <div>
            <label>Cantidad de personas</label>
            <input type="number" min={1} value={form.count}
              onChange={e => setForm({ ...form, count: +e.target.value })} />
          </div>

          <div>
            <label>Asistencia</label>
            <select value={form.optionDays}
              onChange={e => setForm({ ...form, optionDays: e.target.value })}>
              <option value="1">1 día</option>
              <option value="2">2 días</option>
              <option value="full">Todo el campa</option>
            </select>
          </div>

          <div>
            <label>Detalle días</label>
            <input placeholder="viernes / sab-dom"
              value={form.daysDetail}
              onChange={e => setForm({ ...form, daysDetail: e.target.value })} />
          </div>

          <div>
            <label>Familiar principal</label>
            <input required
              value={form.primaryName}
              onChange={e => setForm({ ...form, primaryName: e.target.value })} />
          </div>

          <div>
            <label>Teléfono</label>
            <input required
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div>
            <label>Email (opcional)</label>
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>

          <button className="btn" type="submit">Continuar</button>
        </form>
      </div>
    </Layout>
  );
}
