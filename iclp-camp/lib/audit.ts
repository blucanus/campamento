import type { NextApiRequest } from "next";
import { AuditLog } from "@/models/AuditLog";

export async function auditLog(params: {
  req: NextApiRequest;
  actor: { id: string; email: string; role: string };
  action: string;
  entity: string;
  entityId?: string;
  meta?: any;
}) {
  const ip =
    (params.req.headers["x-forwarded-for"] as string)?.split(",")?.[0]?.trim() ||
    (params.req.socket as any)?.remoteAddress ||
    "";

  const ua = String(params.req.headers["user-agent"] || "");

  await AuditLog.create({
    actor: params.actor,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId || "",
    meta: params.meta || {},
    ip,
    ua,
  });
}
