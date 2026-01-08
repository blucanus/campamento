import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type OptionDays = "full" | "1" | "2";
type OneDay = "viernes" | "sabado" | "domingo";
type TwoDays = "viernes-sabado" | "sabado-domingo";

export default function Paso1() {
  const router = useRouter();
  const [form, setForm] = useState({
    count: 1,
    optionDays: "full" as OptionDays,
    oneDay: "sabado" as OneDay,
    twoDays: "viernes-sabado" as TwoDays,
    primaryFirstName: "",
    primaryLastName: "",
    phone: "",
    email: ""
  });

  // si vuelven atrás, recuperar info
  useEffect(() => {
    const saved = localStorage.getItem("step1");
    if (saved) setForm(JSON.parse(saved));
  }, []);

  function submit(e: any) {
    e.preventDefault();

    const daysDetail =
      form.optionDays === "full"
        ? ""
        : form.optionDays === "1"
          ? form.oneDay
          : form.twoDays;

    const payload = { ...form, daysDetail };
    localStorage.setItem("step1", JSON.stringify(payload));
    router.push("/inscripcion/paso-2");
  }

  return (
    <Layout title="Inscripción – Paso 1">
      <div className="card">
        <h2>Paso 1 – Grupo y días</h2>

        <form onSubmit={submit} className="grid2">
          <div>
            <label>Cantidad de personas</label>
            <input
              type="number"
              min={1}
              value={form.count}
              onChange={(e) => setForm({ ...form, count: +e.target.value })}
            />
          </div>

          <div>
            <label>Asistencia</label>
            <select
              value={form.optionDays}
              onChange={(e) => setForm({ ...form, optionDays: e.target.value as OptionDays })}
            >
              <option value="1">1 día</option>
              <option value="2">2 días</option>
              <option value="full">Todo el campa</option>
            </select>
          </div>

          {/* Días según opción */}
          {form.optionDays === "1" && (
            <div>
              <label>Elegí el día</label>
              <select
                value={form.oneDay}
                onChange={(e) => setForm({ ...form, oneDay: e.target.value as OneDay })}
              >
                <option value="viernes">Viernes</option>
                <option value="sabado">Sábado</option>
                <option value="domingo">Domingo</option>
              </select>
            </div>
          )}

          {form.optionDays === "2" && (
            <div>
              <label>Elegí la combinación</label>
              <select
                value={form.twoDays}
                onChange={(e) => setForm({ ...form, twoDays: e.target.value as TwoDays })}
              >
                <option value="viernes-sabado">Viernes + Sábado</option>
                <option value="sabado-domingo">Sábado + Domingo</option>
              </select>
            </div>
          )}

          {/* Si es full, no mostramos selector de días */}
          <div>
            <label>Nombre del familiar principal</label>
            <input
              required
              value={form.primaryFirstName}
              onChange={(e) => setForm({ ...form, primaryFirstName: e.target.value })}
            />
          </div>

          <div>
            <label>Apellido del familiar principal</label>
            <input
              required
              value={form.primaryLastName}
              onChange={(e) => setForm({ ...form, primaryLastName: e.target.value })}
            />
          </div>

          <div>
            <label>Teléfono</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div>
            <label>Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>


          <button className="btn" type="submit">
            Continuar
          </button>
        </form>
      </div>
    </Layout>
  );
}
