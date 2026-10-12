import type { APIRoute } from "astro";
import db from "../../utils/db";
import { getClientIp, getRedirectUri, isSecureRequest } from "../../utils/session";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

// both signup & login goes through here
export const GET: APIRoute = async ({ request, cookies, clientAddress }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const loginError = (reason: string) =>
    new Response(null, {
      status: 302,
      headers: { Location: "/login?error=" + encodeURIComponent(reason) },
    });

  if (oauthError) {
    return loginError(oauthError);
  }

  const clientId = import.meta.env.CLIENTID;
  const clientSecret = import.meta.env.CLIENTSECRET;
  const redirectUri = getRedirectUri(request, clientAddress);

  if (!clientId || !clientSecret) {
    return new Response("OAuth not configured", { status: 500 });
  }

  const storedState = cookies.get("oauth_state")?.value;
  cookies.delete("oauth_state", { path: "/" });

  if (!returnedState || !storedState || returnedState !== storedState) {
    return loginError("invalid_state");
  }

  if (!code) {
    // ?????
    return new Response("No code provided", {
      status: 400,
    });
  }

  let token: TokenResponse;

  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    token = (await response.json()) as TokenResponse;

    if (!response.ok || !token.access_token) {
      console.error("Token exchange failed:", token.error_description ?? response.status);
      return loginError("oauth_failed");
    }
  } catch (err) {
    console.error("Error occurred during callback processing:", err);
    return loginError("oauth_failed");
  }

  let me: DiscordUser;

  try {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    me = (await response.json()) as DiscordUser;
  } catch (err) {
    console.error("Error fetching Discord user:", err);
    return loginError("userinfo_failed");
  }

  const now = Date.now();
  const sessionId = crypto.randomUUID();

  const ip = getClientIp(request, clientAddress);

  db.prepare("DELETE FROM sessions WHERE discord_id = ?").run(me.id);
  db.prepare("INSERT INTO users (discord_id, role, created_at) VALUES (?, 'user', ?) ON CONFLICT(discord_id) DO NOTHING").run(me.id, now);
  const adminIds = ((import.meta.env.ADMIN_IDS as string | undefined) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (adminIds.includes(me.id)) {
    db.prepare("UPDATE users SET role = 'admin' WHERE discord_id = ?").run(me.id);
  }
  db.prepare("INSERT INTO sessions (id, discord_id, username, avatar, access_token, refresh_token, expires_at, created_at, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(sessionId, me.id, me.username, me.avatar, token.access_token, token.refresh_token ?? null, now + token.expires_in * 1000, now, ip);

  const secure = isSecureRequest(request, clientAddress);

  cookies.set("tadpole_session", sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    secure,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
};
