import type { APIRoute } from "astro";
import db from "../../server/db";

function logout(cookies: Parameters<APIRoute>[0]["cookies"]) {
  const sessionId = cookies.get("tadpole_session")?.value;
  if (sessionId) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
  cookies.delete("tadpole_session", { path: "/" });
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}

export const GET: APIRoute = async ({ cookies }) => {
  return logout(cookies);
};

export const POST: APIRoute = async ({ cookies }) => {
  return logout(cookies);
};
