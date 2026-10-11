import db from "./db";

export interface Session {
  id: string;
  discord_id: string;
  username: string | null;
  avatar: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  created_at: number;
  ip: string | null;
}

interface CookieJar {
  get: (name: string) => { readonly value: string | undefined } | undefined;
}

export function normalizeIp(ip: string): string {
  let v = ip.trim().toLowerCase();
  if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1);
  const zone = v.indexOf("%");
  if (zone !== -1) v = v.slice(0, zone);
  if (v.startsWith("::ffff:")) v = v.slice("::ffff:".length);
  return v;
}

function isPublicIp(ip: string): boolean {
  if (ip.includes(":")) {
    if (ip === "::1") return false;
    if (ip.startsWith("fc") || ip.startsWith("fd")) return false;
    if (ip.startsWith("fe80")) return false;
    return true;
  }
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) return false;
  const [a, b] = parts.map(Number);
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 169 && b === 254) return false;
  return true;
}

export function getClientIp(request: Request, clientAddress?: string): string | null {
  if (clientAddress) {
    const socketIp = normalizeIp(clientAddress);
    if (socketIp && isPublicIp(socketIp)) return socketIp;
  }

  const headers = request.headers;
  const edgeIp = headers.get("cf-connecting-ip")?.trim() || headers.get("true-client-ip")?.trim();
  if (edgeIp) return normalizeIp(edgeIp);

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((s) => normalizeIp(s))
      .filter(Boolean);
    const last = chain.pop();
    if (last) return last;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);

  if (clientAddress) return normalizeIp(clientAddress);
  return null;
}

export function validateSession(request: Request, cookies: CookieJar, clientAddress?: string): Session | null {
  const sessionId = cookies.get("tadpole_session")?.value;
  if (!sessionId) return null;

  const session = db.prepare("SELECT id, discord_id, username, avatar, access_token, refresh_token, expires_at, created_at, ip FROM sessions WHERE id = ?").get(sessionId) as Session | undefined;
  if (!session) return null;

  if (session.expires_at <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }

  const ip = getClientIp(request, clientAddress);
  if (!ip || !session.ip || session.ip !== ip) return null;

  return session;
}
