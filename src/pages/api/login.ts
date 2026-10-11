import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request, cookies }) => {
  const clientId = import.meta.env.CLIENTID;
  const redirectUri = import.meta.env.REDIRECT;

  if (!clientId || !redirectUri) {
    return new Response("OAuth not configured", { status: 500 });
  }

  const state = crypto.randomUUID();
  const secure = new URL(request.url).protocol === "https:";

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

  return Response.redirect(authorize.toString(), 302);
};
