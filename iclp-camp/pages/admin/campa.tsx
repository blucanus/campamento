import Layout from "@/components/Layout";
import { useEffect, useState } from "react";

type Tier = { label: string; price: number; until: string };
type AgeDiscount = { maxAge: number; percent: number };
type Camp = {
  edition: string;
  datesText: string;
  priceFull: number;
  priceNote: string;
  motto: string;
  pricing: {
    tiers: Tier[];
    oneDayFactor: number;
    freeUnderAge: number;
    ageDiscounts: AgeDiscount[];
    familyFrom: number;
    familyPercent: number;
  };
};

const EMPTY: Camp = {
  edition: "",
  datesText: "",
  priceFull: 0,
  priceNote: "",
  motto: "",
  pricing: {
    tiers: [],
    oneDayFactor: 0.5,
    freeUnderAge: 4,
    ageDiscounts: [],
    familyFrom: 5,
    familyPercent: 10
  }
};

function msg(e: unknown) {
  return e instanceof Error ? e.message : "Error";
}

export default function AdminCampa() {
  const [camp, setCamp] = useState<Camp>(EMPTY);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isSuper = role === "superadmin";

  async function load() {
    const [rm, rs] = await Promise.all([
      fetch("/api/admin/me"),
      fetch("/api/admin/registration-settings")
    ]);
    if (rm.status === 401 || rs.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const me = await rm.json().catch(() => ({}));
    setRole(String(me?.admin?.role || ""));

    const j = await rs.json().catch(() => ({}));
    if (j.camp) {
      setCamp({
        ...EMPTY,
        ...j.camp,
        pricing: { ...EMPTY.pricing, ...(j.camp.pricing || {}) }
      });
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setPricing(patch: Partial<Camp["pricing"]>) {
    setCamp((p) => ({ ...p, pricing: { ...p.pricing, ...patch } }));
  }

  async function save(newEdition: boolean) {
    if (!camp.edition.trim()) {
      setErr("Poné un nombre de edición (ej: 2027).");
      return;
    }
    if (newEdition) {
      const ok = window.prompt(
        `Vas a archivar las inscripciones y compras actuales y arrancar la edición "${camp.edition}".\n` +
          "Los datos de las personas se conservan.\n\nEscribí NUEVO para confirmar:"
      );
      if (String(ok || "").trim().toUpperCase() !== "NUEVO") return;
    }

    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/registration-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newEdition ? "new_edition" : "set_edition", ...camp })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j.error || "No se pudo guardar"));

      if (newEdition) {
        const a = (j.archived || {}) as { registrations?: number; merchOrders?: number };
        alert(`Campamento nuevo listo.\nArchivadas: ${a.registrations || 0} inscripciones y ${a.merchOrders || 0} compras.`);
      } else {
        alert("Guardado");
      }
      await load();
    } catch (e: unknown) {
      setErr(msg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Datos del campa">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Datos del campa</h2>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          Lo que se muestra en la landing y en los mails, y cómo se calcula el precio.
        </div>

        {!isSuper ? (
          <div className="alert" style={{ marginTop: 12 }}>
            Solo el <b>superadmin</b> puede modificar estos datos.
          </div>
        ) : null}

        {err ? (
          <div className="alert" style={{ marginTop: 12 }}>
            {err}
          </div>
        ) : null}

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <label>Edición (año)</label>
            <input
              value={camp.edition}
              disabled={!isSuper}
              onChange={(e) => setCamp({ ...camp, edition: e.target.value })}
              placeholder="Ej: 2027"
            />
          </div>
          <div>
            <label>Fechas</label>
            <input
              value={camp.datesText}
              disabled={!isSuper}
              onChange={(e) => setCamp({ ...camp, datesText: e.target.value })}
              placeholder="Ej: 5, 6 y 7 de marzo de 2027"
            />
          </div>
          <div>
            <label>Lema</label>
            <input
              value={camp.motto}
              disabled={!isSuper}
              onChange={(e) => setCamp({ ...camp, motto: e.target.value })}
            />
          </div>
          <div>
            <label>Aclaración de precios (landing)</label>
            <input
              value={camp.priceNote}
              disabled={!isSuper}
              onChange={(e) => setCamp({ ...camp, priceNote: e.target.value })}
              placeholder="Ej: Valores hasta el 31/01/2027"
            />
          </div>
        </div>
      </div>

      {/* PRECIOS POR TRAMO */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Precio por persona</h3>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          Se cobra el primer tramo cuyo <b>hasta</b> todavía no pasó. Si no cargás tramos, se usa el
          precio base. Si ya vencieron todos, vale el último.
        </p>

        <div style={{ maxWidth: 320 }}>
          <label>Precio base</label>
          <input
            type="number"
            min={0}
            value={camp.priceFull}
            disabled={!isSuper}
            onChange={(e) => setCamp({ ...camp, priceFull: Number(e.target.value || 0) })}
          />
        </div>

        <div className="tableWrap" style={{ marginTop: 14 }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Nombre del tramo</th>
                <th>Precio</th>
                <th>Hasta (inclusive)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {camp.pricing.tiers.map((t, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={t.label}
                      disabled={!isSuper}
                      placeholder="Ej: Anticipado"
                      onChange={(e) => {
                        const tiers = [...camp.pricing.tiers];
                        tiers[i] = { ...t, label: e.target.value };
                        setPricing({ tiers });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={t.price}
                      disabled={!isSuper}
                      onChange={(e) => {
                        const tiers = [...camp.pricing.tiers];
                        tiers[i] = { ...t, price: Number(e.target.value || 0) };
                        setPricing({ tiers });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={t.until}
                      disabled={!isSuper}
                      onChange={(e) => {
                        const tiers = [...camp.pricing.tiers];
                        tiers[i] = { ...t, until: e.target.value };
                        setPricing({ tiers });
                      }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={!isSuper}
                      onClick={() =>
                        setPricing({ tiers: camp.pricing.tiers.filter((_, idx) => idx !== i) })
                      }
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {!camp.pricing.tiers.length ? (
                <tr>
                  <td colSpan={4} style={{ opacity: 0.7 }}>
                    Sin tramos: se cobra siempre el precio base.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10 }}>
          <button
            className="btn secondary"
            type="button"
            disabled={!isSuper}
            onClick={() =>
              setPricing({
                tiers: [...camp.pricing.tiers, { label: "", price: camp.priceFull, until: "" }]
              })
            }
          >
            ➕ Agregar tramo
          </button>
        </div>
      </div>

      {/* DESCUENTOS */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Descuentos</h3>

        <div className="grid2">
          <div>
            <label>Menores de esta edad no pagan</label>
            <input
              type="number"
              min={0}
              max={99}
              value={camp.pricing.freeUnderAge}
              disabled={!isSuper}
              onChange={(e) => setPricing({ freeUnderAge: Number(e.target.value || 0) })}
            />
            <div className="fieldHint">0 = todos pagan.</div>
          </div>

          <div>
            <label>Cuánto paga quien viene 1 día</label>
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(camp.pricing.oneDayFactor * 100)}
              disabled={!isSuper}
              onChange={(e) =>
                setPricing({ oneDayFactor: Math.min(100, Number(e.target.value || 0)) / 100 })
              }
            />
            <div className="fieldHint">En % del precio. Ej: 50.</div>
          </div>

          <div>
            <label>Descuento familiar: desde la persona N°</label>
            <input
              type="number"
              min={0}
              max={20}
              value={camp.pricing.familyFrom}
              disabled={!isSuper}
              onChange={(e) => setPricing({ familyFrom: Number(e.target.value || 0) })}
            />
            <div className="fieldHint">0 = sin descuento familiar.</div>
          </div>

          <div>
            <label>...con este % de descuento</label>
            <input
              type="number"
              min={0}
              max={100}
              value={camp.pricing.familyPercent}
              disabled={!isSuper}
              onChange={(e) => setPricing({ familyPercent: Number(e.target.value || 0) })}
            />
            <div className="fieldHint">
              Se aplica a los integrantes más baratos del grupo.
            </div>
          </div>
        </div>

        <h4 style={{ marginBottom: 6 }}>Descuentos por edad</h4>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          Ej: hasta 12 años, 50%. Si una persona entra en más de uno, se le aplica el de menor edad.
        </p>

        <div className="tableWrap">
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Hasta que edad (inclusive)</th>
                <th>% de descuento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {camp.pricing.ageDiscounts.map((d, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={d.maxAge}
                      disabled={!isSuper}
                      onChange={(e) => {
                        const ageDiscounts = [...camp.pricing.ageDiscounts];
                        ageDiscounts[i] = { ...d, maxAge: Number(e.target.value || 0) };
                        setPricing({ ageDiscounts });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={d.percent}
                      disabled={!isSuper}
                      onChange={(e) => {
                        const ageDiscounts = [...camp.pricing.ageDiscounts];
                        ageDiscounts[i] = { ...d, percent: Number(e.target.value || 0) };
                        setPricing({ ageDiscounts });
                      }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={!isSuper}
                      onClick={() =>
                        setPricing({
                          ageDiscounts: camp.pricing.ageDiscounts.filter((_, idx) => idx !== i)
                        })
                      }
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {!camp.pricing.ageDiscounts.length ? (
                <tr>
                  <td colSpan={3} style={{ opacity: 0.7 }}>
                    Sin descuentos por edad.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10 }}>
          <button
            className="btn secondary"
            type="button"
            disabled={!isSuper}
            onClick={() =>
              setPricing({
                ageDiscounts: [...camp.pricing.ageDiscounts, { maxAge: 12, percent: 50 }]
              })
            }
          >
            ➕ Agregar descuento por edad
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={() => save(false)} disabled={!isSuper || saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => save(true)}
            disabled={!isSuper || saving}
            title="Archiva inscripciones y compras, conserva las personas y arranca la edición nueva"
          >
            🏕️ Iniciar campamento nuevo
          </button>
        </div>
      </div>
    </Layout>
  );
}
