import type { NextApiRequest, NextApiResponse } from "next";
import { clearCookie } from "@/lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  clearCookie(res);
  res.json({ ok: true });
}
