import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

const REL_OPTIONS = ["Esposo/a", "Hijo/a", "Padre/Madre", "Hermano/a", "Abuelo/a", "Tío/a", "Primo/a", "Amigo/a", "Otro"];

const emptyPerson = () => ({
  firstName: "",
  lastName: "",
  dni: "",
  age: "", // string para no tener el bug del 0
  relation: "Hijo/a",
  sex: "M",
  isPrimary: false,

  // ✅ autorización
  consentRequired: false,
  consentUrl: ""
});

function needsConsent(ageNum: number) {
  return ageNum >= 15 && ageNum <= 18;
}

export default function Paso2() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<any[]>([]);
  const [step1, setStep1] = useState<any>(null);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [uploadErr, setUploadErr] = useState<Record<number, string>>({});

  // carga inicial
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

  // sincronizar cantidad si cambiaron el count en Paso 1
  useEffect(() => {
    if (!step1) return;
    const desired = Math.max(1, Number(step1.count || 1));

    setAttendees((prev) => {
      const prevLen = prev.length;

      if (prevLen === 0) {
        const base = Array.from({ length: desired }).map(() => emptyPerson());
        base[0].isPrimary = true;
        base[0].relation = "Principal";
        base[0].firstName = step1.primaryFirstName || "";
        base[0].lastName = step1.primaryLastName || "";
        return base;
      }

      if (desired > prevLen) {
        const extra = Array.from({ length: desired - prevLen }).map(() => emptyPerson());
        return [...prev, ...extra];
      }

      if (desired < prevLen) {
        const cut = prev.slice(0, desired);
        if (!cut.some((a: any) => a.isPrimary)) {
          cut[0] = { ...cut[0], isPrimary: true, relation: "Principal" };
        }
        return cut;
      }

      return prev;
    });
  }, [step1]);

  const hasPrimary = useMemo(() => attendees.some((a) => a.isPrimary), [attendees]);

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

  // ✅ subir autorización (queda asociada al integrante dentro de step2 local)
  async function uploadConsent(i: number, file: File) {
    setUploadErr((p) => ({ ...p, [i]: "" }));
    setUploading((p) => ({ ...p, [i]: true }));

    try {
      const regId = localStorage.getItem("regId") || "";
      if (!regId) throw new Error("Primero avanzá al Paso 3 para generar tu inscripción (regId).");

      const att = attendees[i];
      const attId = att?._id; // OJO: si aún no existe _id (solo local), lo manejamos abajo

      if (!attId) {
        // como todavía no existe en DB, lo guardamos en local y lo subimos en checkout (opcional)
        // pero como vos querés verlo en admin, lo ideal es subirlo DESPUÉS de crear el registro.
        throw new Error("Aún no existe el ID del integrante. Continuá al Paso 3 y volvé a Paso 2.");
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("registrationId", regId);
      fd.append("attendeeId", attId);

      const r = await fetch("/api/public/upload-consent", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo subir");

      update(i, { consentRequired: true, consentUrl: j.url });
    } catch (e: any) {
      setUploadErr((p) => ({ ...p, [i]: e?.message || "Error" }));
    } finally {
      setUploading((p) => ({ ...p, [i]: false }));
    }
  }

  function submit(e: any) {
    e.preventDefault();
    if (!hasPrimary) setPrimary(0);

    const normalized = attendees.map((a) => {
      const ageNum = Number(String(a.age || "").trim() || 0);
      const req = needsConsent(ageNum);

      return {
        ...a,
        age: ageNum,
        consentRequired: req,
        consentUrl: String(a.consentUrl || "")
      };
    });

    // ✅ validación obligatoria
    const missing = normalized.find((a) => a.consentRequired && !a.consentUrl);
    if (missing) {
      alert("Falta subir la autorización firmada para al menos un integrante (15 a 18 años).");
      return;
    }

    localStorage.setItem("step2", JSON.stringify(normalized));
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
          {attendees.map((a, i) => {
            const ageNum = Number(String(a.age || "").trim() || 0);
            const req = needsConsent(ageNum);

            return (
              <div className="card cardTight" key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>
                    Persona #{i + 1} {a.isPrimary ? <span className="badgePill">⭐ Principal</span> : null}
                  </h3>

                  {!a.isPrimary ? (
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setPrimary(i)}
                      style={{ borderRadius: 999, fontWeight: 900 }}
                    >
                      Hacer principal
                    </button>
                  ) : (
                    <span className="badgePill">Este es el familiar principal</span>
                  )}
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
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 12"
                      value={a.age ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        update(i, { age: v });
                      }}
                      required
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
                    <label>Sexo</label>
                    <select value={a.sex} onChange={(e) => update(i, { sex: e.target.value })}>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                </div>

                {/* ✅ AUTORIZACIÓN 15-18 */}
                {req ? (
                  <div className="card" style={{ marginTop: 12, borderStyle: "dashed" }}>
                    <h4 style={{ margin: 0 }}>Autorización de padres / tutores (obligatoria)</h4>
                    <p style={{ marginTop: 6, opacity: 0.85 }}>
                      Este integrante tiene <b>{ageNum}</b> años. Debe presentar autorización firmada.
                    </p>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <a className="btn secondary" href="/nota-autorizacion.pdf" target="_blank" rel="noreferrer">
                        Descargar autorización
                      </a>

                      <label className="btn" style={{ cursor: "pointer" }}>
                        {uploading[i] ? "Subiendo..." : a.consentUrl ? "Re-subir autorización" : "Subir autorización firmada"}
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          style={{ display: "none" }}
                          disabled={!!uploading[i]}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadConsent(i, f);
                          }}
                        />
                      </label>

                      {a.consentUrl ? (
                        <a className="btn secondary" href={a.consentUrl} target="_blank" rel="noreferrer">
                          Ver archivo subido
                        </a>
                      ) : (
                        <span style={{ fontWeight: 800, color: "#b91c1c" }}>
                          Falta subir el archivo
                        </span>
                      )}
                    </div>

                    {uploadErr[i] ? (
                      <div className="alert" style={{ marginTop: 10 }}>
                        {uploadErr[i]}
                      </div>
                    ) : null}

                    <small style={{ display: "block", marginTop: 10 }}>
                      Formatos aceptados: PDF o imagen. Máx 10MB.
                    </small>
                  </div>
                ) : null}
              </div>
            );
          })}

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
