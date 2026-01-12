import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const REL_OPTIONS = ["Esposo/a","Hijo/a","Padre/Madre","Hermano/a","Abuelo/a","Tío/a","Primo/a","Amigo/a","Otro"];

const emptyPerson = () => ({
  firstName: "",
  lastName: "",
  dni: "",
  age: 0,
  relation: "Hijo/a",
  diet: "ninguna",
  sex: "M",
  isPrimary: false
});

export default function Paso2() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<any[]>([]);
  const [step1, setStep1] = useState<any>(null);

  useEffect(() => {
    const s1 = JSON.parse(localStorage.getItem("step1") || "null");
    if (!s1) {
      router.push("/inscripcion/paso-1");
      return;
    }
    setStep1(s1);

    const saved2 = localStorage.getItem("step2");
    if (saved2) {
      setAttendees(JSON.parse(saved2));
      return;
    }

    const count = Number(s1.count || 1);
    const base = Array.from({ length: count }).map(() => emptyPerson());

    base[0].isPrimary = true;
    base[0].relation = "Principal";
    base[0].firstName = s1.primaryFirstName || "";
    base[0].lastName = s1.primaryLastName || "";

    setAttendees(base);
  }, [router]);

  function update(i: number, patch: any) {
    setAttendees((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function setPrimary(i: number) {
    setAttendees((prev) =>
      prev.map((p, idx) => {
        if (idx === i) return { ...p, isPrimary: true, relation: "Principal" };
        const rel = p.relation === "Principal" ? "Hijo/a" : p.relation;
        return { ...p, isPrimary: false, relation: rel };
      })
    );
  }

  function back() {
    localStorage.setItem("step2", JSON.stringify(attendees));
    router.push("/inscripcion/paso-1");
  }

  function submit(e: any) {
    e.preventDefault();
    if (!attendees.some((a) => a.isPrimary)) setPrimary(0);

    localStorage.setItem("step2", JSON.stringify(attendees));
    router.push("/inscripcion/paso-3");
  }

  if (!step1) return null;

  return (
    <Layout title="Inscripción – Paso 2">
      <div className="wizard">
        <div className="wizardHead">
          <div>
            <h2 className="wizardTitle">Datos de las personas</h2>
            <p className="wizardSub">Paso 2 de 3 — Integrantes del grupo</p>
          </div>

          <div className="stepper">
            <div className="step isDone"><span className="stepDot" /> Paso 1</div>
            <div className="step isActive"><span className="stepDot" /> Paso 2</div>
            <div className="step"><span className="stepDot" /> Resumen</div>
          </div>
        </div>

        <form onSubmit={submit}>
          {attendees.map((a, i) => (
            <div className="card cardTight" key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>
                  Persona #{i + 1}{" "}
                  {a.isPrimary ? <span className="badgePill">⭐ Principal</span> : null}
                </h3>

                <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="primary"
                    checked={a.isPrimary}
                    onChange={() => setPrimary(i)}
                  />
                  Familiar principal
                </label>
              </div>

              <div className="formGrid" style={{ marginTop: 10 }}>
                <div>
                  <label>Nombre</label>
                  <input value={a.firstName} required onChange={(e) => update(i, { firstName: e.target.value })} />
                </div>
                <div>
                  <label>Apellido</label>
                  <input value={a.lastName} required onChange={(e) => update(i, { lastName: e.target.value })} />
                </div>
                <div>
                  <label>DNI</label>
                  <input
                    value={a.dni}
                    required
                    inputMode="numeric"
                    placeholder="Sin puntos"
                    onChange={(e) => update(i, { dni: e.target.value })}
                  />
                </div>
                <div>
                  <label>Edad</label>
                  <input
                    type="number"
                    min={0}
                    value={a.age}
                    required
                    inputMode="numeric"
                    onChange={(e) => update(i, { age: Number(e.target.value) })}
                  />
                  <div className="fieldHint">Menores de 4 años no abonan.</div>
                </div>

                <div>
                  <label>Relación con el principal</label>
                  {a.isPrimary ? (
                    <input value="Principal" disabled />
                  ) : (
                    <select value={a.relation} onChange={(e) => update(i, { relation: e.target.value })}>
                      {REL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label>Dieta</label>
                  <select value={a.diet} onChange={(e) => update(i, { diet: e.target.value })}>
                    <option value="ninguna">Ninguna</option>
                    <option value="celiaco">Celíaco</option>
                    <option value="intolerante">Intolerante</option>
                    <option value="vegetariano">Vegetariano</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label>Sexo</label>
                  <select value={a.sex} onChange={(e) => update(i, { sex: e.target.value })}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <div className="stickyBar" style={{ marginTop: 14 }}>
            <button type="button" className="btn secondary" onClick={back}>
              ← Volver
            </button>
            <button className="btn" type="submit">
              Continuar →
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
