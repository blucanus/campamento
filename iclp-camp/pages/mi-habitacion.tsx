import Layout from "@/components/Layout";
import { FormEvent, useMemo, useRef, useState } from "react";

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

const EMOJI = {
  ticket: "\u{1F3AB}",
  camp: "\u{1F3D5}\uFE0F",
  rainbow: "\u{1F308}",
  wave: "\u{1F44B}",
  person: "\u{1F464}",
  card: "\u{1F4C7}",
  house: "\u{1F3E0}",
  bed: "\u{1F6CC}",
  people: "\u{1F465}",
  family: "\u{1F46A}",
  heart: "\u{1F49B}",
  info: "\u2139\uFE0F",
  confetti: "\u{1F389}",
  bag: "\u{1F4BC}",
  smile: "\u{1F603}",
  ok: "\u2705",
  hand: "\u{1F64B}"
} as const;

function friendlyBed(raw: string) {
  const v = String(raw || "").toLowerCase();
  if (v === "arriba") return "Arriba";
  if (v === "abajo") return "Abajo";
  if (v === "none" || v === "-") return "Sin asignar";
  return raw || "Sin asignar";
}

export default function MiHabitacion() {
  const [dni, setDni] = useState("");
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [err, setErr] = useState("");
  const ticketRef = useRef<HTMLDivElement | null>(null);

  const hasFamily = (data?.groupCount || 0) > 1;

  const whatsappMessage = useMemo(() => {
    if (!data) return "";

    const lines: string[] = [];
    lines.push(`${EMOJI.rainbow} *Tu lugar en el Campa ya esta listo!*`);
    lines.push(`${EMOJI.camp} *Campamento ICLP - Boarding Pass*`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push(`${EMOJI.wave} *Nombre:* ${data.target.fullName}`);
    lines.push(`${EMOJI.card} *DNI:* ${data.target.dni || "-"}`);
    lines.push(`${EMOJI.house} *Habitacion:* ${data.target.room}`);
    lines.push(`${EMOJI.bed} *Cama:* ${friendlyBed(data.target.bed)}`);
    lines.push(
      `${EMOJI.people} *Modalidad:* ${
        data.groupType === "familiar" ? "Grupo familiar" : "Individual"
      }`
    );

    if (data.isPrimary && hasFamily) {
      lines.push("");
      lines.push(`${EMOJI.heart} *Tu equipo familiar (${data.groupCount})*`);
      for (const m of data.familyMembers) {
        lines.push(
          `• ${m.fullName} (${m.dni || "-"})\n   ${EMOJI.house} ${m.room} | ${EMOJI.bed} ${friendlyBed(m.bed)}`
        );
      }
    } else if (!data.isPrimary && hasFamily) {
      lines.push("");
      lines.push(`${EMOJI.info} Vas con el grupo de *${data.primaryName}*.`);
    }

    lines.push("");
    lines.push(`${EMOJI.confetti} Se viene un campa hermoso!`);
    lines.push(`${EMOJI.bag} Tip: trae abrigo, buena onda y muchas ganas.`);
    lines.push(`${EMOJI.smile} Nos vemos pronto.`);
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
      setErr(ex instanceof Error ? ex.message : "No se pudo consultar el DNI.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdfDirect() {
    if (!data || !ticketRef.current) return;

    setErr("");
    setDownloadingPdf(true);
    const ticketNode = ticketRef.current;

    try {
      ticketNode.classList.add("is-exporting-pdf");

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);

      const canvas = await html2canvas(ticketNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const targetWidth = pageWidth - margin * 2;
      const targetHeight = (canvas.height * targetWidth) / canvas.width;

      let heightLeft = targetHeight;
      let positionY = margin;

      pdf.addImage(imgData, "PNG", margin, positionY, targetWidth, targetHeight, undefined, "FAST");
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        pdf.addPage();
        positionY = margin - (targetHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, positionY, targetWidth, targetHeight, undefined, "FAST");
        heightLeft -= pageHeight - margin * 2;
      }

      const dniSafe = String(data.target.dni || "").replace(/\D/g, "") || "sin-dni";
      pdf.save(`boarding-pass-${dniSafe}.pdf`);
    } catch {
      setErr("No se pudo descargar el PDF. Intenta nuevamente.");
    } finally {
      ticketNode.classList.remove("is-exporting-pdf");
      setDownloadingPdf(false);
    }
  }

  function sendWhatsApp() {
    if (!data) return;
    const url = "https://wa.me/?text=" + encodeURIComponent(whatsappMessage);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Layout title="Mi habitacion">
      <div className="card check-pass-shell">
        <div className="check-pass-hero">
          <div>
            <p className="check-pass-eyebrow">Informacion de alojamiento</p>
            <h2 style={{ margin: 0 }}>
              Boarding Pass del Campamento {EMOJI.ticket}
            </h2>
            <p style={{ margin: "8px 0 0", opacity: 0.82 }}>
              Consulta por DNI para ver habitacion y cama asignadas.
            </p>
          </div>
          <div className="check-pass-stamp" aria-hidden>
            {EMOJI.ok} LISTO
          </div>
        </div>

        <form onSubmit={buscar} className="check-pass-search">
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
          <div className="check-pass-ticket" ref={ticketRef}>
            <div className="check-pass-head">
              <div>
                <div className="check-pass-brand">
                  {EMOJI.camp} Campamento ICLP
                </div>
                <div className="check-pass-code">BOARDING PASS / MI HABITACION</div>
              </div>
              <div className="check-pass-badge">
                {data.groupType === "familiar"
                  ? `${EMOJI.family} FAMILIAR`
                  : `${EMOJI.hand} INDIVIDUAL`}
              </div>
            </div>

            <div className="check-pass-main">
              <div className="check-pass-block">
                <p className="check-pass-label">Pasajero</p>
                <p className="check-pass-value">
                  {EMOJI.person} {data.target.fullName}
                </p>
              </div>
              <div className="check-pass-block">
                <p className="check-pass-label">DNI</p>
                <p className="check-pass-value">
                  {EMOJI.card} {data.target.dni || "-"}
                </p>
              </div>
              <div className="check-pass-block">
                <p className="check-pass-label">Habitacion</p>
                <p className="check-pass-value">
                  {EMOJI.house} {data.target.room}
                </p>
              </div>
              <div className="check-pass-block">
                <p className="check-pass-label">Cama</p>
                <p className="check-pass-value">
                  {EMOJI.bed} {friendlyBed(data.target.bed)}
                </p>
              </div>
            </div>

            {data.isPrimary && hasFamily ? (
              <div className="check-pass-family">
                <h3 style={{ marginTop: 0 }}>
                  {EMOJI.family} Grupo Familiar ({data.groupCount})
                </h3>
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
                {EMOJI.info} Este DNI pertenece al grupo familiar de <b>{data.primaryName}</b>.
              </div>
            ) : null}

            <div className="check-pass-actions">
              <button
                className="btn secondary"
                type="button"
                onClick={downloadPdfDirect}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? "Generando PDF..." : "Descargar PDF"}
              </button>
              <button className="btn" type="button" onClick={sendWhatsApp}>
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

