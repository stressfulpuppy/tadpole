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

export function isPublicIp(ip: string): boolean {
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
  const trustProxy = (import.meta.env.TRUST_PROXY as string | undefined) === "1" || (import.meta.env.TRUST_PROXY as string | undefined) === "true";

  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded
        .split(",")
        .map((s) => normalizeIp(s))
        .find(Boolean);
      if (first) return first;
    }
  }

  if (clientAddress) {
    const socketIp = normalizeIp(clientAddress);
    if (socketIp && isPublicIp(socketIp)) return socketIp;
  }

  if (clientAddress) return normalizeIp(clientAddress);
  return null;
}

export function getPageClientIp(request: Request): string | undefined {
  const v = Reflect.get(request, Symbol.for("astro.clientAddress"));
  return typeof v === "string" ? v : undefined;
}

export function validateSession(request: Request, cookies: CookieJar, clientAddress?: string): Session | null {
  const sessionId = cookies.get("tadpole_session")?.value;
  if (!sessionId) return null;

  const session = db.prepare("SELECT s.id, s.discord_id, s.username, s.avatar, s.access_token, s.refresh_token, s.expires_at, s.created_at, s.ip, COALESCE(u.role, 'user') AS role FROM sessions s LEFT JOIN users u ON u.discord_id = s.discord_id WHERE s.id = ?").get(sessionId) as Session | undefined;
  if (!session) return null;

  if (session.expires_at <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }

  return session;
}

export function getAvatarUrl(session: Pick<Session, "discord_id" | "avatar">, size = 64): string {
  if (!session.avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(session.discord_id) >> 22n) % 6}.png`;
  }
  const ext = session.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${session.discord_id}/${session.avatar}.${ext}?size=${size}`;
}

export function getPublicOrigin(request: Request, _clientAddress?: string): string {
  const configuredOrigin = (import.meta.env.ORIGIN as string | undefined)?.trim().replace(/\/$/, "");
  if (configuredOrigin) return configuredOrigin;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const hostHeader = request.headers.get("host")?.split(",")[0].trim();
  const host = forwardedHost || hostHeader || new URL(request.url).host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto = forwardedProto || new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function isSecureRequest(request: Request, clientAddress?: string): boolean {
  return getPublicOrigin(request, clientAddress).startsWith("https://");
}

export function getRedirectUri(request: Request, clientAddress?: string): string {
  const configured = import.meta.env.REDIRECT as string | undefined;
  if (configured) return configured;
  return new URL("/api/callback", getPublicOrigin(request, clientAddress)).toString();
}
