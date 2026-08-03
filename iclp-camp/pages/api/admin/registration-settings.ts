import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { RegistrationAccessCode } from "@/models/RegistrationAccessCode";
import { Registration } from "@/models/Registration";
import { MerchOrder } from "@/models/MerchOrder";
import {
  generateRegistrationAccessCode,
  getOrCreateRegistrationControl
} from "@/lib/registrationAccess";
import { archiveCollectionName, getCampEdition } from "@/lib/campEdition";
import { auditLog } from "@/lib/audit";

type EditionInput = {
  edition?: string;
  datesText?: string;
  priceFull?: number;
  priceNote?: string;
  motto?: string;
};

type ActionBody =
  | { action: "set_open"; open: boolean }
  | { action: "create_invite"; note?: string; maxUses?: number; expiresDays?: number }
  | { action: "deactivate_invite"; code?: string }
  | ({ action: "set_edition" } & EditionInput)
  | ({ action: "new_edition"; archive?: boolean } & EditionInput);
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

/**
 * Copia inscripciones y compras de merch a colecciones historicas (registrations_2026, etc.).
 * Los datos de las personas viven aparte, en la coleccion `campers`, y no se tocan.
 */
async function archiveCurrentEdition(previousEdition: string) {
  const regCount = await Registration.countDocuments({});
  const merchCount = await MerchOrder.countDocuments({});

  // $out pisa la coleccion destino: solo archivamos si hay algo que archivar.
  if (regCount > 0) {
    await Registration.aggregate([{ $out: archiveCollectionName("registrations", previousEdition) }]);
  }
  if (merchCount > 0) {
    await MerchOrder.aggregate([{ $out: archiveCollectionName("merchorders", previousEdition) }]);
  }

  return { registrations: regCount, merchOrders: merchCount };
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
      camp: await getCampEdition(),
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

  if (action === "set_edition" || action === "new_edition") {
    const input = body as EditionInput & { archive?: boolean };
    const edition = String(input.edition || "").trim();
    if (!edition) return res.status(400).json({ error: "Falta el nombre de la edicion (ej: 2027)." });

    const control = await getOrCreateRegistrationControl();
    const previousEdition = String(control.edition || "sin-edicion");

    let archived = { registrations: 0, merchOrders: 0 };

    if (action === "new_edition") {
      if (input.archive !== false) {
        archived = await archiveCurrentEdition(previousEdition);
      }
      await Registration.deleteMany({});
      await MerchOrder.deleteMany({});
      await RegistrationAccessCode.updateMany({ isActive: true }, { $set: { isActive: false } });
      control.registrationsOpen = true;
    }

    control.edition = edition;
    control.datesText = String(input.datesText || "").trim();
    control.priceFull = Math.max(0, Number(input.priceFull || 0));
    control.priceNote = String(input.priceNote || "").trim();
    control.motto = String(input.motto || "").trim();
    await control.save();

    await auditLog({
      req,
      actor: { id: admin.id, email: admin.email, role: admin.role },
      action,
      entity: "RegistrationControl",
      meta: { previousEdition, edition, archived }
    });

    return res.status(200).json({ ok: true, camp: await getCampEdition(), archived });
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
