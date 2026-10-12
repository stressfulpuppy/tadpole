import type { APIRoute } from "astro";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import db from "../../server/db";

interface FileRow {
  id: string;
  discord_id: string;
  name: string;
  size: number;
  mime: string | null;
  created_at: number;
}

export const GET: APIRoute = async ({ params, request }) => {
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
    size = (await stat(path)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const safeName = row.name.replace(/["\\\r\n]/g, "_");
  const encodedName = encodeURIComponent(row.name);

  const headers: Record<string, string> = {
    "Content-Type": row.mime || "application/octet-stream",
    "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
    "Content-Security-Policy": "sandbox",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      let start = match[1] === "" ? size - Number(match[2]) : Number(match[1]);
      let end = match[2] === "" ? size - 1 : Number(match[2]);
      if (Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start && start < size) {
        end = Math.min(end, size - 1);
        headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
        headers["Content-Length"] = String(end - start + 1);
        return new Response(Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream, {
          status: 206,
          headers,
        });
      }
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
  }

  headers["Content-Length"] = String(size);
  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, { headers });
};
