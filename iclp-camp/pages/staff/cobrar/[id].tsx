import Layout from "@/components/Layout";
import Badge from "@/components/Badge";
import { paymentStatusLabel, paymentStatusTone } from "@/lib/ui";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

type Device = { id: string; operating_mode?: string };
type Reg = {
  _id?: string;
  primary?: { name?: string; phone?: string; email?: string };
  attendees?: unknown[];
  payment?: { status?: string; initPoint?: string };
};

function money(n: number) {
  return `$ ${Number(n || 0).toLocaleString("es-AR")}`;
}

export default function Cobrar() {
  const { query } = useRouter();
  const id = String(query.id || "");

  const [reg, setReg] = useState<Reg | null>(null);
  const [total, setTotal] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [qr, setQr] = useState("");
  const [interopQr, setInteropQr] = useState("");
  const [msg, setMsg] = useState("");
  const [charging, setCharging] = useState(false);
  const [busyQr, setBusyQr] = useState(false);

  const device = devices.find((d) => d.id === deviceId);
  const needsPdv = Boolean(device && device.operating_mode && device.operating_mode !== "PDV");

  const approved = String(reg?.payment?.status || "").toLowerCase() === "approved";
  const payLink = String(reg?.payment?.initPoint || "");

  const loadReg = useCallback(async () => {
    if (!id) return;
    const r = await fetch(`/api/admin/registration?id=${encodeURIComponent(id)}`);
    if (r.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setReg(await r.json().catch(() => null));
  }, [id]);

  useEffect(() => {
    loadReg();
  }, [loadReg]);

  // Posnets + total a cobrar
  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await fetch(`/api/staff/point?registrationId=${encodeURIComponent(id)}`);
      const j = await r.json().catch(() => ({}));
      const list = Array.isArray(j.devices) ? (j.devices as Device[]) : [];
      setDevices(list);
      setTotal(Number(j.total || 0));
      if (list[0]) setDeviceId(list[0].id);
    })();
  }, [id]);

  // QR del link de pago de Mercado Pago
  useEffect(() => {
    if (!payLink) return;
    (async () => {
      const QRCode = await import("qrcode");
      setQr(await QRCode.toDataURL(payLink, { width: 320, margin: 1 }));
    })();
  }, [payLink]);

  const checkStatus = useCallback(async () => {
    if (!id) return;
    const r = await fetch("/api/admin/refresh-payment-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "registration", id })
    });
    const j = await r.json().catch(() => ({}));
    if (j?.status) {
      setReg((prev) => (prev ? { ...prev, payment: { ...prev.payment, status: j.status } } : prev));
    }
  }, [id]);

  // Mientras no esté pago, chequeamos solos cada 5s.
  useEffect(() => {
    if (!id || approved) return;
    const t = setInterval(checkStatus, 5000);
    return () => clearInterval(t);
  }, [id, approved, checkStatus]);

  // Inscripción trunca: nunca generó el link de pago.
  async function generatePayLink() {
    setMsg("");
    try {
      const r = await fetch("/api/staff/pay-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j.error || "No se pudo generar el link"));
      setReg((prev) =>
        prev ? { ...prev, payment: { ...prev.payment, initPoint: String(j.initPoint || "") } } : prev
      );
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "No se pudo generar el link");
    }
  }

  async function copyPayLink() {
    if (!payLink) return;
    try {
      await navigator.clipboard.writeText(payLink);
      setMsg("📋 Link de pago copiado.");
    } catch {
      window.prompt("Copiá el link:", payLink);
    }
  }

  // QR que tambien leen Cuenta DNI, MODO y otras billeteras.
  async function generateInteropQr() {
    setBusyQr(true);
    setMsg("");
    try {
      const r = await fetch("/api/staff/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j.error || "No se pudo generar el QR"));

      const QRCode = await import("qrcode");
      setInteropQr(await QRCode.toDataURL(String(j.qrData || ""), { width: 320, margin: 1 }));
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "No se pudo generar el QR");
    } finally {
      setBusyQr(false);
    }
  }

  async function setPdvMode() {
    setMsg("");
    try {
      const r = await fetch("/api/staff/point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pdv", deviceId })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j.error || "No se pudo cambiar el modo"));
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, operating_mode: "PDV" } : d))
      );
      setMsg("Posnet en modo PDV. Ya podés cobrar.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "No se pudo cambiar el modo");
    }
  }

  async function chargeOnPoint() {
    if (!deviceId) {
      setMsg("No hay ningún posnet disponible.");
      return;
    }

    setCharging(true);
    setMsg("");
    try {
      const r = await fetch("/api/staff/point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id, deviceId })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j.error || "No se pudo enviar el cobro"));
      setMsg(`Cobro enviado al posnet por ${money(j.total)}. Seguí en la terminal.`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "No se pudo enviar el cobro");
    } finally {
      setCharging(false);
    }
  }

  if (!reg) {
    return (
      <Layout title="Cobrar">
        <div className="card">Cargando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Cobrar">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>{reg.primary?.name || "-"}</h2>
            <div style={{ opacity: 0.85 }}>
              {reg.attendees?.length || 0} persona(s) · {reg.primary?.phone || "-"}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Badge tone={paymentStatusTone(reg.payment?.status)}>
                {paymentStatusLabel(reg.payment?.status)}
              </Badge>
              <b style={{ fontSize: 22 }}>{money(total)}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Link className="btn secondary" href="/staff">
              ← Volver
            </Link>
            <button className="btn secondary" type="button" onClick={checkStatus}>
              Comprobar estado
            </button>
          </div>
        </div>
      </div>

      {approved ? (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>✅ Pago confirmado</h3>
          <p style={{ marginBottom: 0 }}>No hace falta cobrar de nuevo.</p>
        </div>
      ) : (
        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>
              {interopQr ? "📱 QR para cualquier billetera" : "📱 Que pague con el celular"}
            </h3>

            {interopQr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={interopQr}
                  alt="QR interoperable"
                  style={{ width: "100%", maxWidth: 320, borderRadius: 12 }}
                />
                <p style={{ opacity: 0.8 }}>
                  Lo leen Mercado Pago, Cuenta DNI, MODO y otras billeteras con QR interoperable.
                </p>
                <button className="btn secondary" type="button" onClick={() => setInteropQr("")}>
                  Volver al QR de Mercado Pago
                </button>
              </>
            ) : qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR de pago" style={{ width: "100%", maxWidth: 320, borderRadius: 12 }} />
                <p style={{ opacity: 0.8 }}>Escaneá el QR y pagás desde Mercado Pago.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn secondary" type="button" onClick={copyPayLink}>
                    📋 Copiar link
                  </button>
                  <a className="btn secondary" href={payLink} target="_blank" rel="noreferrer">
                    Abrir link
                  </a>
                  <a
                    className="btn secondary"
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Tu inscripción al Campamento ICLP: ${money(total)}. Link de pago: ${payLink}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={generateInteropQr}
                    disabled={busyQr}
                  >
                    {busyQr ? "Generando..." : "QR para otras billeteras"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ opacity: 0.8 }}>
                  Esta inscripción quedó trunca: nunca generó el link de pago.
                </p>
                <button className="btn" type="button" onClick={generatePayLink}>
                  Generar link de pago
                </button>
              </>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>💳 Cobrar en el posnet</h3>

            {devices.length ? (
              <>
                <label>Posnet</label>
                <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} {d.operating_mode ? `(${d.operating_mode})` : ""}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={chargeOnPoint}
                    disabled={charging || needsPdv}
                  >
                    {charging ? "Enviando..." : `Enviar ${money(total)} al posnet`}
                  </button>

                  {needsPdv ? (
                    <button className="btn secondary" type="button" onClick={setPdvMode}>
                      Poner en modo PDV
                    </button>
                  ) : null}
                </div>

                {needsPdv ? (
                  <p style={{ opacity: 0.8, marginBottom: 0 }}>
                    Este posnet está en modo {device?.operating_mode}. Pasalo a PDV para cobrar
                    desde acá.
                  </p>
                ) : null}
              </>
            ) : (
              <p style={{ opacity: 0.8 }}>
                No hay posnets disponibles. Revisá que el Point Smart esté encendido, vinculado a la
                cuenta y en modo PDV.
              </p>
            )}

            {msg ? (
              <div className="alert" style={{ marginTop: 10 }}>
                {msg}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Layout>
  );
}
