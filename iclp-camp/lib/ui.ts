export function paymentStatusLabel(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "Aprobado";
  if (s === "pending" || s === "in_process") return "Pendiente";
  if (s === "rejected") return "Rechazado";
  if (s === "cancelled") return "Cancelado";
  if (!s) return "-";
  return s;
}

export function paymentStatusTone(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "success";
  if (s === "pending" || s === "in_process") return "warning";
  if (s === "rejected" || s === "cancelled") return "danger";
  return "muted";
}
