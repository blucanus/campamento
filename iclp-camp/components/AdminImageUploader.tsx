import { useState } from "react";

export default function AdminImageUploader({
  folder = "products",
  value,
  onChange,
  label = "Foto",
}: {
  folder?: string;
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setErr(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const r = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo subir");

      onChange(j.url); // ✅ guardamos URL pública
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label>{label} (upload)</label>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept="image/*"
          disabled={loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />

        {value ? (
          <button className="btn secondary" type="button" onClick={copy}>
            Copiar URL
          </button>
        ) : null}

        {loading ? <small style={{ opacity: 0.8 }}>Subiendo...</small> : null}
      </div>

      {value ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }} />
          <div style={{ wordBreak: "break-all", maxWidth: 520, opacity: 0.9 }}>{value}</div>
        </div>
      ) : (
        <small style={{ opacity: 0.85 }}>
          Subí una imagen y se guardará la URL automáticamente.
        </small>
      )}

      {err ? (
        <div className="alert">{err}</div>
      ) : null}
    </div>
  );
}
