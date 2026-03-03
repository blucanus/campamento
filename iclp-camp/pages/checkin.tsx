import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import { FormEvent, useMemo, useState } from "react";

const Scanner = dynamic(() => import("@/components/QrScanner"), { ssr: false });

type FamilyMember = {
  fullName: string;
  firstName: string;
  lastName: string;
  dni: string;
  relation: string;
  isPrimary: boolean;
  room: string;
  bed: string;
};

type LookupResponse = {
  room: string;
  bed: string;
  target: FamilyMember;
  isPrimary: boolean;
  groupType: "solo" | "familiar";
  groupCount: number;
  primaryName: string;
  familyMembers: FamilyMember[];
};

function getErrorMessage(ex: unknown) {
  if (ex instanceof Error) return ex.message;
  return "No se pudo consultar el DNI.";
}

function friendlyBed(raw: string) {
  const v = String(raw || "").toLowerCase();
  if (v === "arriba") return "Arriba";
  if (v === "abajo") return "Abajo";
  if (v === "none" || v === "-") return "Sin asignar";
  return raw || "Sin asignar";
}

export default function Checkin() {
  const [dni, setDni] = useState("");
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const hasFamily = (data?.groupCount || 0) > 1;

  const whatsappMessage = useMemo(() => {
    if (!data) return "";

    const lines: string[] = [];
    lines.push("Campamento ICLP - Boarding Pass");
    lines.push("");
    lines.push(`Persona: ${data.target.fullName}`);
    lines.push(`DNI: ${data.target.dni || "-"}`);
    lines.push(`Habitacion: ${data.target.room}`);
    lines.push(`Cama: ${friendlyBed(data.target.bed)}`);
    lines.push(`Tipo: ${data.groupType === "familiar" ? "Grupo familiar" : "Individual"}`);

    if (data.isPrimary && hasFamily) {
      lines.push("");
      lines.push("Grupo familiar:");
      for (const m of data.familyMembers) {
        lines.push(
          `- ${m.fullName} (${m.dni || "-"}) | Hab: ${m.room} | Cama: ${friendlyBed(m.bed)}`
        );
      }
    } else if (!data.isPrimary && hasFamily) {
      lines.push("");
      lines.push(`Titular principal: ${data.primaryName}`);
    }

    return lines.join("\n");
  }, [data, hasFamily]);

  async function buscar(e?: FormEvent) {
    e?.preventDefault();
    setErr("");
    setData(null);

    const clean = String(dni || "").replace(/\D/g, "");
    if (!clean) {
      setErr("Ingresa un DNI valido.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/public/dni-lookup?dni=" + encodeURIComponent(clean));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "No se encontro informacion para ese DNI.");
      setData(j as LookupResponse);
    } catch (ex: unknown) {
      setErr(getErrorMessage(ex));
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!data) return;
    window.print();
  }

  function sendWhatsApp() {
    if (!data) return;
    const url = "https://wa.me/?text=" + encodeURIComponent(whatsappMessage);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Layout title="Check-in">
      <div className="card check-pass-shell">
        <div className="check-pass-hero">
          <div>
            <p className="check-pass-eyebrow">Check-in inteligente</p>
            <h2 style={{ margin: 0 }}>Boarding Pass del Campamento 🎟️</h2>
            <p style={{ margin: "8px 0 0", opacity: 0.82 }}>
              Ingresa el DNI para ver habitacion, cama y grupo familiar.
            </p>
          </div>
          <div className="check-pass-stamp" aria-hidden>
            ✅ LISTO
          </div>
        </div>

        <form onSubmit={buscar} className="check-pass-search" data-print-hide>
          <input
            placeholder="Ej: 30123456"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            inputMode="numeric"
          />
          <button className="btn lp-btn-primary" type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Buscar DNI"}
          </button>
        </form>

        {err ? (
          <div className="alert" style={{ marginTop: 10 }}>
            {err}
          </div>
        ) : null}

        {data ? (
          <div className="check-pass-ticket" id="boarding-pass">
            <div className="check-pass-head">
              <div>
                <div className="check-pass-brand">🏕️ Campamento ICLP</div>
                <div className="check-pass-code">BOARDING PASS / CHECK-IN</div>
              </div>
              <div className="check-pass-badge">
                {data.groupType === "familiar" ? "👨‍👩‍👧‍👦 FAMILIAR" : "🙋 INDIVIDUAL"}
              </div>
            </div>

            <div className="check-pass-main">
              <div className="check-pass-block">
                <p className="check-pass-label">Pasajero</p>
                <p className="check-pass-value">{data.target.fullName}</p>
              </div>
              <div className="check-pass-block">
                <p className="check-pass-label">DNI</p>
                <p className="check-pass-value">{data.target.dni || "-"}</p>
              </div>
              <div className="check-pass-block">
                <p className="check-pass-label">Habitacion</p>
                <p className="check-pass-value">🏠 {data.target.room}</p>
              </div>
              <div className="check-pass-block">
                <p className="check-pass-label">Cama</p>
                <p className="check-pass-value">🛏️ {friendlyBed(data.target.bed)}</p>
              </div>
            </div>

            {data.isPrimary && hasFamily ? (
              <div className="check-pass-family">
                <h3 style={{ marginTop: 0 }}>👨‍👩‍👧‍👦 Grupo Familiar ({data.groupCount})</h3>
                <div className="check-pass-family-list">
                  {data.familyMembers.map((m, idx) => (
                    <div key={`${m.dni}-${idx}`} className="check-pass-family-row">
                      <div>
                        <b>{m.fullName}</b>
                        <span style={{ opacity: 0.75 }}>
                          {" "}
                          ({m.relation || "Integrante"})
                          {m.isPrimary ? " - Principal" : ""}
                        </span>
                      </div>
                      <div>
                        Hab: <b>{m.room}</b> | Cama: <b>{friendlyBed(m.bed)}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!data.isPrimary && hasFamily ? (
              <div className="check-pass-note">
                ℹ️ Este DNI pertenece al grupo familiar de <b>{data.primaryName}</b>.
              </div>
            ) : null}

            <div className="check-pass-actions" data-print-hide>
              <button className="btn secondary" type="button" onClick={downloadPdf}>
                Descargar PDF
              </button>
              <button className="btn" type="button" onClick={sendWhatsApp}>
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <details className="card" data-print-hide>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Escanear QR (opcional)</summary>
        <div style={{ marginTop: 10 }}>
          <Scanner />
        </div>
      </details>

      <div className="card" data-print-hide>
        <small>
          Consejo: para PDF usa el boton &quot;Descargar PDF&quot; y en la impresion selecciona
          &quot;Guardar como PDF&quot;.
        </small>
      </div>
    </Layout>
  );
}
