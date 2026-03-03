import { Registration } from "@/models/Registration";
import { RegistrationAccessCode } from "@/models/RegistrationAccessCode";
import { RegistrationControl } from "@/models/RegistrationControl";

type AccessSource = "open" | "existing_reg" | "invite_code" | "denied";

export type AccessCheckResult = {
  allowed: boolean;
  registrationsOpen: boolean;
  source: AccessSource;
  code: string;
  reason?: string;
};

function normalizeCode(input: unknown) {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function isValidObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function inviteBaseFilter(code: string, now: Date) {
  return {
    code,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
  };
}

export async function getOrCreateRegistrationControl() {
  let control = await RegistrationControl.findOne({ singleton: "main" });
  if (!control) {
    control = await RegistrationControl.create({
      singleton: "main",
      registrationsOpen: true
    });
  }
  return control;
}

export async function checkRegistrationAccess(params: {
  code?: unknown;
  regId?: unknown;
}): Promise<AccessCheckResult> {
  const control = await getOrCreateRegistrationControl();
  const registrationsOpen = Boolean(control.registrationsOpen);
  const code = normalizeCode(params.code);
  const regId = String(params.regId || "").trim();

  if (registrationsOpen) {
    return { allowed: true, registrationsOpen: true, source: "open", code };
  }

  if (regId && isValidObjectId(regId)) {
    const existing = await Registration.findById(regId).select("_id").lean();
    if (existing) {
      return { allowed: true, registrationsOpen: false, source: "existing_reg", code };
    }
  }

  if (!code) {
    return {
      allowed: false,
      registrationsOpen: false,
      source: "denied",
      code,
      reason:
        "Las inscripciones estan cerradas. Si tenes un codigo especial, usa el link unico."
    };
  }

  const now = new Date();
  const invite = await RegistrationAccessCode.findOne(inviteBaseFilter(code, now)).lean();

  if (!invite) {
    return {
      allowed: false,
      registrationsOpen: false,
      source: "denied",
      code,
      reason: "Codigo invalido, vencido o inactivo."
    };
  }

  if (Number(invite.usedCount || 0) >= Number(invite.maxUses || 1)) {
    return {
      allowed: false,
      registrationsOpen: false,
      source: "denied",
      code,
      reason: "Este codigo ya fue utilizado."
    };
  }

  return { allowed: true, registrationsOpen: false, source: "invite_code", code };
}

export async function consumeRegistrationAccessCode(codeInput: unknown) {
  const code = normalizeCode(codeInput);
  if (!code) return null;
  const now = new Date();

  const updated = await RegistrationAccessCode.findOneAndUpdate(
    {
      ...inviteBaseFilter(code, now),
      $expr: { $lt: ["$usedCount", "$maxUses"] }
    },
    {
      $inc: { usedCount: 1 },
      $set: { lastUsedAt: now }
    },
    { new: true }
  );

  return updated;
}

export function generateRegistrationAccessCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ICLP-${stamp}-${rnd}`;
}

