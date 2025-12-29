import jwt from "jsonwebtoken";
import { env } from "@/lib/env";
import { parse, serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE = "admin_token";

export function signToken(payload: any) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function setCookie(res: NextApiResponse, token: string) {
  res.setHeader("Set-Cookie", serialize(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production"
  }));
}
export function clearCookie(res: NextApiResponse) {
  res.setHeader("Set-Cookie", serialize(COOKIE, "", { path: "/", maxAge: 0 }));
}

export function requireAdmin(req: NextApiRequest) {
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  if (!cookies[COOKIE]) return null;
  try { return jwt.verify(cookies[COOKIE], env.JWT_SECRET) as any; }
  catch { return null; }
}
