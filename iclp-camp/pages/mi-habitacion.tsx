import Layout from "@/components/Layout";
import { FormEvent, useMemo, useState } from "react";

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

function friendlyBed(raw: string) {
  const v = String(raw || "").toLowerCase();
  if (v === "arriba") return "Arriba";
  if (v === "abajo") return "Abajo";
  if (v === "none" || v === "-") return "Sin asignar";
  return raw || "Sin asignar";
}

function stripAccents(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toPdfSafe(v: string) {
  return stripAccents(String(v || ""))
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function escapePdfText(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfBlob(lines: string[]) {
  const safeLines = lines.map((x) => toPdfSafe(x)).filter(Boolean);
  const maxLinesPerPage = 44;
  const chunks: string[][] = [];

  for (let i = 0; i < safeLines.length; i += maxLinesPerPage) {
    chunks.push(safeLines.slice(i, i + maxLinesPerPage));
  }
  if (chunks.length === 0) chunks.push(["Boarding Pass"]);

  const pageContents = chunks.map((chunk) => {
    let y = 790;
    const out = ["BT", "/F1 11 Tf"];
    for (const line of chunk) {
      out.push(`1 0 0 1 48 ${y} Tm (${escapePdfText(line)}) Tj`);
      y -= 16;
    }
    out.push("ET");
    return out.join("\n");
  });

  const pagesCount = pageContents.length;
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  const contentStartId = 4;
  const pageStartId = contentStartId + pagesCount;
  const totalObjects = pageStartId + pagesCount - 1;

  const objects: string[] = new Array(totalObjects + 1).fill("");

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  const kids = Array.from({ length: pagesCount }, (_, i) => `${pageStartId + i} 0 R`).join(" ");
  objects[pagesId] = `<< /Type /Pages /Kids [ ${kids} ] /Count ${pagesCount} >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  for (let i = 0; i < pagesCount; i++) {
    const contentId = contentStartId + i;
    const pageId = pageStartId + i;
    const content = pageContents[i];

    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    objects[pageId] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  }

  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = new Array(totalObjects + 1).fill(0);

  for (let id = 1; id <= totalObjects; id++) {
    offsets[id] = encoder.encode(pdf).length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${totalObjects + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= totalObjects; id++) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjects + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildPdfLines(data: LookupResponse) {
  const lines: string[] = [];
  lines.push("BOARDING PASS - CAMPAMENTO ICLP");
  lines.push("-------------------------------------------");
  lines.push(`Pasajero: ${data.target.fullName}`);
  lines.push(`DNI: ${data.target.dni || "-"}`);
  lines.push(`Habitacion: ${data.target.room}`);
  lines.push(`Cama: ${friendlyBed(data.target.bed)}`);
  lines.push(`Tipo: ${data.groupType === "familiar" ? "Grupo familiar" : "Individual"}`);

  if (data.isPrimary && data.groupCount > 1) {
    lines.push("");
    lines.push(`Grupo familiar (${data.groupCount})`);
    for (const m of data.familyMembers) {
      lines.push(
        `- ${m.fullName} (${m.dni || "-"}) | Hab: ${m.room} | Cama: ${friendlyBed(m.bed)}`
      );
    }
  } else if (!data.isPrimary && data.groupCount > 1) {
    lines.push("");
    lines.push(`Titular principal: ${data.primaryName}`);
  }

  return lines;
}

export default function MiHabitacion() {
  const [dni, setDni] = useState("");
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const hasFamily = (data?.groupCount || 0) > 1;

  const whatsappMessage = useMemo(() => {
    if (!data) return "";

    const lines: string[] = [];
    lines.push("🌈 *¡Tu lugar en el Campa ya esta listo!*");
    lines.push("🏕️ *Campamento ICLP - Boarding Pass*");
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push(`👋 *Nombre:* ${data.target.fullName}`);
    lines.push(`🪪 *DNI:* ${data.target.dni || "-"}`);
    lines.push(`🏠 *Habitacion:* ${data.target.room}`);
    lines.push(`🛏️ *Cama:* ${friendlyBed(data.target.bed)}`);
    lines.push(
      `👥 *Modalidad:* ${data.groupType === "familiar" ? "Grupo familiar" : "Individual"}`
    );

    if (data.isPrimary && hasFamily) {
      lines.push("");
      lines.push(`💛 *Tu equipo familiar (${data.groupCount})*`);
      for (const m of data.familyMembers) {
        lines.push(
          `• ${m.fullName} (${m.dni || "-"})\n   🏠 ${m.room} | 🛏️ ${friendlyBed(m.bed)}`
        );
      }
    } else if (!data.isPrimary && hasFamily) {
      lines.push("");
      lines.push(`🫶 Vas con el grupo de *${data.primaryName}*.`);
    }

    lines.push("");
    lines.push("🎉 ¡Se viene un campa hermoso!");
    lines.push("🧳 Tip: trae abrigo, buena onda y muchas ganas.");
    lines.push("😄 Nos vemos pronto.");
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

  function downloadPdfDirect() {
    if (!data) return;
    const lines = buildPdfLines(data);
    const blob = buildPdfBlob(lines);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dniSafe = String(data.target.dni || "").replace(/\D/g, "") || "sin-dni";
    a.href = url;
    a.download = `boarding-pass-${dniSafe}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            <h2 style={{ margin: 0 }}>Boarding Pass del Campamento 🎟️</h2>
            <p style={{ margin: "8px 0 0", opacity: 0.82 }}>
              Consulta por DNI para ver habitacion y cama asignadas.
            </p>
          </div>
          <div className="check-pass-stamp" aria-hidden>
            ✅ LISTO
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
          <div className="check-pass-ticket">
            <div className="check-pass-head">
              <div>
                <div className="check-pass-brand">🏕️ Campamento ICLP</div>
                <div className="check-pass-code">BOARDING PASS / MI HABITACION</div>
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

            <div className="check-pass-actions">
              <button className="btn secondary" type="button" onClick={downloadPdfDirect}>
                Descargar PDF
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
