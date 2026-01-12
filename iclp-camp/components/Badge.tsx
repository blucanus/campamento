export default function Badge({
  children,
  tone = "muted"
}: {
  children: any;
  tone?: "success" | "warning" | "danger" | "muted";
}) {
  const style: any = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)"
  };

  if (tone === "success") style.background = "rgba(34,197,94,0.18)";
  if (tone === "warning") style.background = "rgba(245,158,11,0.18)";
  if (tone === "danger") style.background = "rgba(239,68,68,0.18)";

  return <span style={style}>{children}</span>;
}
