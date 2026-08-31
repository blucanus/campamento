import { useEffect, useState } from "react";

type ToastTone = "success" | "warning" | "danger" | "info";

const TONES: Record<ToastTone, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: "#e6f6ec", border: "rgba(47,158,95,0.32)", color: "#1c6b3f", icon: "✓" },
  warning: { bg: "#fdf1dd", border: "rgba(227,154,34,0.35)", color: "#7d5205", icon: "!" },
  danger: { bg: "#fdeceb", border: "rgba(214,69,63,0.32)", color: "#a32d28", icon: "✕" },
  info: { bg: "#e8f1fa", border: "rgba(47,111,176,0.28)", color: "#205384", icon: "i" }
};

export function ToastHost({
  toast,
  onClose
}: {
  toast: { message: string; tone?: ToastTone } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const t = TONES[toast.tone || "info"];

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        left: 16,
        display: "flex",
        justifyContent: "flex-end",
        pointerEvents: "none",
        zIndex: 9999
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        role="status"
        style={{
          pointerEvents: "auto",
          minWidth: 240,
          maxWidth: 420,
          padding: "12px 14px",
          borderRadius: 14,
          background: t.bg,
          border: `1px solid ${t.border}`,
          color: t.color,
          boxShadow: "0 12px 32px rgba(22,33,29,0.14)",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          animation: "toastIn 0.22s cubic-bezier(0.2,0.8,0.3,1)"
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              flex: "0 0 auto",
              borderRadius: 999,
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 900
            }}
          >
            {t.icon}
          </span>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{toast.message}</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            border: "none",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1,
            padding: 4,
            opacity: 0.7
          }}
        >
          ✕
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
