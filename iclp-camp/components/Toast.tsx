import { useEffect, useState } from "react";

type ToastTone = "success" | "warning" | "danger" | "info";

export function ToastHost({
  toast,
  onClose
}: {
  toast: { message: string; tone?: ToastTone } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone = toast.tone || "info";

  const bg =
    tone === "success"
      ? "rgba(34,197,94,0.18)"
      : tone === "warning"
        ? "rgba(245,158,11,0.18)"
        : tone === "danger"
          ? "rgba(239,68,68,0.18)"
          : "rgba(59,130,246,0.18)";

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999
      }}
    >
      <div
        style={{
          minWidth: 260,
          maxWidth: 420,
          padding: "10px 12px",
          borderRadius: 14,
          background: bg,
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>{toast.message}</div>
        <button
          className="btn secondary"
          style={{ padding: "6px 10px" }}
          onClick={onClose}
          type="button"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone?: ToastTone } | null>(null);
  return {
    toast,
    show: (message: string, tone?: ToastTone) => setToast({ message, tone }),
    close: () => setToast(null)
  };
}
