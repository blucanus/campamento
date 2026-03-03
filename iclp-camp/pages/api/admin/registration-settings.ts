import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { RegistrationAccessCode } from "@/models/RegistrationAccessCode";
import {
  generateRegistrationAccessCode,
  getOrCreateRegistrationControl
} from "@/lib/registrationAccess";

type ActionBody =
  | { action: "set_open"; open: boolean }
  | { action: "create_invite"; note?: string; maxUses?: number; expiresDays?: number }
  | { action: "deactivate_invite"; code?: string };
type InviteLean = {
  code?: string;
  note?: string;
  isActive?: boolean;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: Date | null;
  createdAt?: Date | null;
  lastUsedAt?: Date | null;
};

function normalizeCode(input: unknown) {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();

  if (req.method === "GET") {
    const control = await getOrCreateRegistrationControl();
    const invites = await RegistrationAccessCode.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      registrationsOpen: Boolean(control.registrationsOpen),
      invites: (invites as InviteLean[]).map((x) => {
        const code = String(x.code || "");
        return {
        code,
        note: x.note || "",
        isActive: Boolean(x.isActive),
        maxUses: Number(x.maxUses || 1),
        usedCount: Number(x.usedCount || 0),
        expiresAt: x.expiresAt || null,
        createdAt: x.createdAt || null,
        lastUsedAt: x.lastUsedAt || null,
        link: `${env.APP_URL}/inscripcion/paso-1?code=${encodeURIComponent(code)}`
      };
      })
    });
  }

  if (req.method !== "POST") return res.status(405).end();

  const body = (req.body || {}) as Partial<ActionBody>;
  const action = String(body.action || "");

  if (action === "set_open") {
    const open = Boolean(body && "open" in body ? body.open : false);
    const control = await getOrCreateRegistrationControl();
    control.registrationsOpen = open;
    await control.save();
    return res.status(200).json({ ok: true, registrationsOpen: open });
  }

  if (action === "create_invite") {
    const note = String(body && "note" in body ? body.note : "").trim();
    const maxUsesRaw = Number(body && "maxUses" in body ? body.maxUses : 1);
    const maxUses = Number.isFinite(maxUsesRaw) ? Math.max(1, Math.min(100, maxUsesRaw)) : 1;
    const expiresDaysRaw = Number(body && "expiresDays" in body ? body.expiresDays : 0);
    const expiresDays = Number.isFinite(expiresDaysRaw)
      ? Math.max(0, Math.min(365, expiresDaysRaw))
      : 0;

    let created: InviteLean | null = null;
    for (let i = 0; i < 10; i++) {
      const code = generateRegistrationAccessCode();
      try {
        created = await RegistrationAccessCode.create({
          code,
          note,
          createdBy: admin.email || admin.id || "admin",
          isActive: true,
          maxUses,
          usedCount: 0,
          expiresAt: expiresDays > 0 ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null
        });
        break;
      } catch {
        // retry if unique collision
      }
    }

    if (!created) {
      return res.status(500).json({ error: "No se pudo generar un codigo unico." });
    }

    const createdCode = String(created.code || "");
    const link = `${env.APP_URL}/inscripcion/paso-1?code=${encodeURIComponent(createdCode)}`;
    return res.status(200).json({
      ok: true,
      invite: {
        code: createdCode,
        note: created.note || "",
        isActive: Boolean(created.isActive),
        maxUses: Number(created.maxUses || 1),
        usedCount: Number(created.usedCount || 0),
        expiresAt: created.expiresAt || null,
        createdAt: created.createdAt || null,
        link
      }
    });
  }

  if (action === "deactivate_invite") {
    const code = normalizeCode(body && "code" in body ? body.code : "");
    if (!code) return res.status(400).json({ error: "Missing code" });

    await RegistrationAccessCode.updateOne(
      { code },
      { $set: { isActive: false } }
    );

    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Invalid action" });
}
