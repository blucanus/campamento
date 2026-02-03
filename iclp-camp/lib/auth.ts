import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

type TokenPayload = { id: string; email: string; role: string };

const COOKIE_NAME = "admin_token";

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function setCookie(res: NextApiResponse, token: string) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 30}`, // 30d
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearCookie(res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

function getCookieFromReq(req: NextApiRequest): string {
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : "";
}

export function getAdmin(req: NextApiRequest): TokenPayload | null {
  const token = getCookieFromReq(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(req: NextApiRequest): TokenPayload | null {
  const u = getAdmin(req);
  if (!u) return null;
  if (u.role !== "admin" && u.role !== "superadmin") return null;
  return u;
}

export function requireSuperAdmin(req: NextApiRequest): TokenPayload | null {
  const u = getAdmin(req);
  if (!u) return null;
  if (u.role !== "superadmin") return null;
  return u;
}
