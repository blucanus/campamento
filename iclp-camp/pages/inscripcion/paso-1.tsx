import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type OptionDays = "full" | "1" | "2";
type OneDay = "viernes" | "sabado" | "domingo";
type TwoDays = "viernes-sabado" | "sabado-domingo";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

  useEffect(() => {
    const saved = localStorage.getItem("step1");
    if (saved) setForm(JSON.parse(saved));
  }, []);

  const daysDetail = useMemo(() => {
    return form.optionDays === "full"
      ? ""
      : form.optionDays === "1"
        ? form.oneDay
        : form.twoDays;
  }, [form.optionDays, form.oneDay, form.twoDays]);

  function setCount(next: number) {
    setForm((p) => ({ ...p, count: clamp(next, 1, 20) })); // límite 20 (ajustalo si querés)
  }

  function submit(e: any) {
    e.preventDefault();
    const payload = { ...form, daysDetail };
    localStorage.setItem("step1", JSON.stringify(payload));
    router.push("/inscripcion/paso-2");
  }

  return (
    <Layout title="Inscripción – Paso 1">
      <div className="wizard">
        <div className="wizardHead">
          <div>
            <h2 className="wizardTitle">Inscripción</h2>
            <p className="wizardSub">Paso 1 de 3 — Grupo y contacto</p>
          </div>

          <div className="stepper">
            <div className="step isActive"><span className="stepDot" /> Paso 1</div>
            <div className="step"><span className="stepDot" /> Paso 2</div>
            <div className="step"><span className="stepDot" /> Resumen</div>
          </div>
        </div>

        <div className="card cardTight">
          <form onSubmit={submit}>
            <div className="formGrid">
              <div>
                <label>Cantidad de personas</label>

                {/* Control + / - (sin escribir) */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setCount(form.count - 1)}
                    disabled={form.count <= 1}
                    aria-label="Restar"
                    style={{ width: 56 }}
                  >
                    −
                  </button>

                  <div className="badgePill" style={{ justifyContent: "center", minWidth: 90 }}>
                    {form.count}
                  </div>

                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setCount(form.count + 1)}
                    disabled={form.count >= 20}
                    aria-label="Sumar"
                    style={{ width: 56 }}
                  >
                    +
                  </button>
                </div>

                {/* Alternativa rápida: select */}
                <div style={{ marginTop: 10 }}>
                  <label style={{ marginTop: 0, opacity: 0.75 }}>Elegir</label>
                  <select value={form.count} onChange={(e) => setCount(Number(e.target.value))}>
                    {Array.from({ length: 20 }).map((_, i) => {
                      const v = i + 1;
                      return <option key={v} value={v}>{v} persona{v === 1 ? "" : "s"}</option>;
                    })}
                  </select>
                </div>

                <div className="fieldHint">Incluye al familiar principal.</div>
              </div>

              <div>
                <label>Asistencia</label>

                <div className="segment" role="group" aria-label="Asistencia">
                  <button
                    type="button"
                    className={`segBtn ${form.optionDays === "1" ? "isActive" : ""}`}
                    onClick={() => setForm({ ...form, optionDays: "1" })}
                  >
                    1 día
                  </button>
                  <button
                    type="button"
                    className={`segBtn ${form.optionDays === "2" ? "isActive" : ""}`}
                    onClick={() => setForm({ ...form, optionDays: "2" })}
                  >
                    2 días
                  </button>
                  <button
                    type="button"
                    className={`segBtn ${form.optionDays === "full" ? "isActive" : ""}`}
                    onClick={() => setForm({ ...form, optionDays: "full" })}
                  >
                    Todo el campa
                  </button>
                </div>

                {form.optionDays === "1" && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ marginTop: 0 }}>Elegí el día</label>
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
                  <div style={{ marginTop: 10 }}>
                    <label style={{ marginTop: 0 }}>Elegí la combinación</label>
                    <select
                      value={form.twoDays}
                      onChange={(e) => setForm({ ...form, twoDays: e.target.value as TwoDays })}
                    >
                      <option value="viernes-sabado">Viernes + Sábado</option>
                      <option value="sabado-domingo">Sábado + Domingo</option>
                    </select>
                  </div>
                )}

                <div className="fieldHint">
                  1 día paga 50%. 2 días o todo el campa paga total.
                </div>
              </div>

              <div>
                <label>Nombre del familiar principal</label>
                <input
                  required
                  autoComplete="given-name"
                  value={form.primaryFirstName}
                  onChange={(e) => setForm({ ...form, primaryFirstName: e.target.value })}
                />
              </div>

              <div>
                <label>Apellido del familiar principal</label>
                <input
                  required
                  autoComplete="family-name"
                  value={form.primaryLastName}
                  onChange={(e) => setForm({ ...form, primaryLastName: e.target.value })}
                />
              </div>

              <div>
                <label>Teléfono</label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej: 221 555-1234"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label>Email (obligatorio)</label>
                <input
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <div className="fieldHint">
                  Te llega el mail de inscripción y luego el de pago confirmado.
                </div>
              </div>
            </div>

            <div className="stickyBar" style={{ marginTop: 14 }}>
              <button className="btn secondary" type="button" onClick={() => router.push("/")}>
                ← Volver al inicio
              </button>
              <button className="btn" type="submit">
                Continuar →
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
