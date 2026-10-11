import type { APIRoute } from "astro";
import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import db from "../../utils/db";

interface FileRow {
  id: string;
  discord_id: string;
  name: string;
  size: number;
  mime: string | null;
  created_at: number;
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const row = db.prepare("SELECT id, discord_id, name, size, mime, created_at FROM files WHERE id = ?").get(id) as FileRow | undefined;
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const path = join("data/uploads", row.id);

  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const safeName = row.name.replace(/["\\\r\n]/g, "_");

  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
    headers: {
      "Content-Type": row.mime || "application/octet-stream",
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
