import { useEffect, useRef, useState } from "react";

export default function QrScanner() {
  const started = useRef(false);
  const [last, setLast] = useState<string>("");
  const [lock, setLock] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let scanner: any;

    (async () => {
      const mod = await import("html5-qrcode");
      const Html5QrcodeScanner = (mod as any).Html5QrcodeScanner;

      scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
      scanner.render(async (text: string) => {
        if (lock) return;
        setLock(true);

        const r = await fetch("/api/public/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: text })
        });

        if (r.ok) setLast(text);
        setTimeout(() => setLock(false), 5000);
      });
    })();

    return () => {
      try { scanner?.clear?.(); } catch {}
    };
  }, [lock]);

  return (
    <>
      <div id="qr-reader" />
      <p style={{ marginTop: 10 }}>
        <b>Último token:</b> {last || "-"} {lock ? "(bloqueado 5s)" : ""}
      </p>
    </>
  );
}
