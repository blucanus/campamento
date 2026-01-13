import { useState } from "react";

export default function AdminImageUploader({
  folder = "products",
  value,
  onChange,
}: {
  folder?: string;
  value?: string;
  onChange: (url: string) => void;
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

      onChange(j.url); // guardamos URL pública en Mongo
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <label>Foto (upload)</label>

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
        <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10 }} />
          <div style={{ wordBreak: "break-all", maxWidth: 520, opacity: 0.9 }}>{value}</div>
        </div>
      ) : (
        <small style={{ display: "block", marginTop: 8, opacity: 0.85 }}>
          Subí una imagen y se guardará la URL automáticamente.
        </small>
      )}

      {err ? (
        <div className="alert" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 10 }}>
        <button className="btn" type="button" disabled={loading}>
          {loading ? "Subiendo..." : "Listo"}
        </button>
      </div>
    </div>
  );
}
