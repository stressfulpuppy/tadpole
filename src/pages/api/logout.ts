import type { APIRoute } from "astro";
import db from "../../utils/db";
import { getPublicOrigin } from "../../utils/session";

function logout(cookies: Parameters<APIRoute>[0]["cookies"], request: Request, clientAddress?: string) {
  const sessionId = cookies.get("tadpole_session")?.value;
  if (sessionId) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
  cookies.delete("tadpole_session", { path: "/" });
  return Response.redirect(new URL("/", getPublicOrigin(request, clientAddress)).toString(), 302);
}

export const GET: APIRoute = async ({ request, cookies, clientAddress }) => {
  return logout(cookies, request, clientAddress);
};

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  return logout(cookies, request, clientAddress);
};
