export default function Badge({
  children,
  tone = "muted"
}: {
  children: any;
  tone?: "success" | "warning" | "danger" | "info" | "muted";
}) {
  const cls = tone === "muted" ? "badge" : `badge ${tone}`;
  return <span className={cls}>{children}</span>;
}
