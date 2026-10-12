import type { APIRoute } from "astro";
import { getRedirectUri, isSecureRequest } from "../../server/session";

export const GET: APIRoute = async ({ request, cookies, clientAddress }) => {
  const clientId = import.meta.env.CLIENTID;
  const redirectUri = getRedirectUri(request, clientAddress);

  if (!clientId) {
    return new Response("OAuth not configured", { status: 500 });
  }

  const state = crypto.randomUUID();
  const secure = isSecureRequest(request, clientAddress);

  cookies.set("oauth_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    secure,
  });

  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: { Location: authorize.toString() },
  });
};
