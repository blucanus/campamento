import Layout from "@/components/Layout";
import { normalizePhoneAR } from "@/lib/pure";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type OptionDays = "full" | "1" | "2";
type OneDay = "viernes" | "sabado" | "domingo";
type TwoDays = "viernes-sabado" | "sabado-domingo";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Paso1() {
  const router = useRouter();
  const [gateLoading, setGateLoading] = useState(true);
  const [gateMsg, setGateMsg] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [specialAccess, setSpecialAccess] = useState(false);
  const [lookupDni, setLookupDni] = useState("");
  const [lookupMsg, setLookupMsg] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
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

  async function checkGate(codeInput?: string) {
    const raw = String(codeInput || "").trim();
    const code = raw.toUpperCase().replace(/\s+/g, "");
    const qs = code ? `?code=${encodeURIComponent(code)}` : "";

    setGateLoading(true);
    try {
      const r = await fetch(`/api/public/registration-access-status${qs}`);
      const j = await r.json().catch(() => ({}));

      if (j.allowed) {
        setGateMsg("");
        setSpecialAccess(!j.registrationsOpen);
        if (code) {
          localStorage.setItem("registrationAccessCode", code);
          setManualCode(code);
        }
      } else {
        setSpecialAccess(false);
        setGateMsg(String(j.message || "Inscripciones cerradas."));
      }
    } catch {
      setSpecialAccess(false);
      setGateMsg("No se pudo verificar el estado de inscripciones.");
    } finally {
      setGateLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;

    const urlCode =
      typeof router.query.code === "string" ? router.query.code : "";
    const savedCode = localStorage.getItem("registrationAccessCode") || "";
    const code = (urlCode || savedCode).trim();

    if (urlCode) {
      localStorage.setItem(
        "registrationAccessCode",
        urlCode.toUpperCase().replace(/\s+/g, "")
      );
    }

    setManualCode(code.toUpperCase().replace(/\s+/g, ""));
    checkGate(code);
  }, [router.isReady, router.query.code]);

  const phoneCheck = useMemo(() => normalizePhoneAR(form.phone), [form.phone]);

  const daysDetail = useMemo(() => {
    return form.optionDays === "full"
      ? ""
      : form.optionDays === "1"
        ? form.oneDay
        : form.twoDays;
  }, [form.optionDays, form.oneDay, form.twoDays]);

  // Autocompletar con los datos de campas anteriores (padron de personas).
  async function autocompletar() {
    const dni = String(lookupDni || "").replace(/\D/g, "");
    if (!dni) {
      setLookupMsg("Ingresá un DNI para buscar.");
      return;
    }

    setLookingUp(true);
    setLookupMsg("");
    try {
      const r = await fetch(`/api/public/camper-lookup?dni=${encodeURIComponent(dni)}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "No encontramos ese DNI.");

      type Member = {
        dni?: string;
        firstName?: string;
        lastName?: string;
        sex?: string;
        age?: number;
      };
      const person = (j.person || {}) as Member;

      setForm((p) => ({
        ...p,
        primaryFirstName: person.firstName || p.primaryFirstName,
        primaryLastName: person.lastName || p.primaryLastName,
        phone: String(j.phone || "") || p.phone,
        email: String(j.email || "") || p.email
      }));

      // Solo la persona del DNI: al resto del grupo se lo agrega (y busca) en el paso 2.
      localStorage.setItem("prefillGroup", JSON.stringify([person]));
      localStorage.removeItem("step2");
      localStorage.removeItem("regId");

      setLookupMsg(
        "Cargamos tus datos. Revisalos, y en el paso 2 agregás al resto del grupo buscándolos por DNI."
      );
    } catch (e: unknown) {
      setLookupMsg(e instanceof Error ? e.message : "No se pudo buscar el DNI.");
    } finally {
      setLookingUp(false);
    }
  }

  function setCount(next: number) {
    setForm((p) => ({ ...p, count: clamp(next, 1, 20) })); // límite 20 (ajustalo si querés)
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const wa = normalizePhoneAR(form.phone);
    if (!wa.ok) {
      alert("Revisá el WhatsApp: poné código de área y número, sin 0 ni 15. Ej: 221 555-1234.");
      return;
    }

    const payload = { ...form, phone: wa.display, whatsapp: wa.wa, daysDetail };
    localStorage.setItem("step1", JSON.stringify(payload));
    router.push("/inscripcion/paso-2");
  }

  if (gateLoading) {
    return (
      <Layout title="Inscripción – Paso 1">
        <div className="card">Verificando estado de inscripciones...</div>
      </Layout>
    );
  }

  if (gateMsg) {
    return (
      <Layout title="Inscripción – Paso 1">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Inscripciones cerradas</h2>
          <div className="alert" style={{ marginTop: 10 }}>
            {gateMsg}
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Codigo de acceso especial</label>
            <input
              placeholder="Ej: ICLP-ABC123-XYZ789"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => checkGate(manualCode)}>
              Validar codigo
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => router.push("/")}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </Layout>
    );
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
          {specialAccess ? (
            <div
              className="badgePill"
              style={{
                marginBottom: 10,
                background: "rgba(34,197,94,0.12)",
                borderColor: "rgba(34,197,94,0.35)"
              }}
            >
              Acceso especial habilitado por codigo unico
            </div>
          ) : null}

          <div className="card cardTight" style={{ marginBottom: 12, borderStyle: "dashed" }}>
            <h3 style={{ margin: 0 }}>¿Ya viniste a un campa?</h3>
            <p style={{ margin: "6px 0 10px", opacity: 0.85 }}>
              Poné tu DNI y completamos tus datos y los de tu grupo familiar.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                placeholder="Ej: 30123456"
                inputMode="numeric"
                value={lookupDni}
                onChange={(e) => setLookupDni(e.target.value)}
                style={{ flex: "1 1 220px" }}
              />
              <button className="btn secondary" type="button" onClick={autocompletar} disabled={lookingUp}>
                {lookingUp ? "Buscando..." : "Autocompletar"}
              </button>
            </div>

            {lookupMsg ? (
              <div className="fieldHint" style={{ marginTop: 8 }}>
                {lookupMsg}
              </div>
            ) : null}
          </div>

          <form onSubmit={submit}>
            <div className="formGrid">
              <div>
                <label>Cantidad de personas</label>

                {/* Solo + / -: el select duplicaba el mismo dato. */}
                <div className="stepperNum">
                  <button
                    type="button"
                    className="stepperBtn"
                    onClick={() => setCount(form.count - 1)}
                    disabled={form.count <= 1}
                    aria-label="Restar una persona"
                  >
                    −
                  </button>

                  <div className="stepperValue" aria-live="polite">
                    <b>{form.count}</b>
                    <span>persona{form.count === 1 ? "" : "s"}</span>
                  </div>

                  <button
                    type="button"
                    className="stepperBtn"
                    onClick={() => setCount(form.count + 1)}
                    disabled={form.count >= 20}
                    aria-label="Sumar una persona"
                  >
                    +
                  </button>
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
                <label>WhatsApp (obligatorio)</label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej: 221 555-1234"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onBlur={(e) => {
                    const w = normalizePhoneAR(e.target.value);
                    if (w.ok) setForm((p) => ({ ...p, phone: w.display }));
                  }}
                />
                <div className="fieldHint">
                  {phoneCheck.ok ? (
                    <>Te vamos a escribir por WhatsApp a <b>{phoneCheck.display}</b>.</>
                  ) : (
                    <>Con código de área, sin 0 ni 15. Ej: 221 555-1234.</>
                  )}
                </div>
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
