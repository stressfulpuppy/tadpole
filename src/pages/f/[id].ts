import type { APIRoute } from "astro";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import db from "../../server/db";
import { resolveServeMime } from "../../server/mime";

interface FileRow {
  id: string;
  discord_id: string;
  name: string;
  size: number;
  mime: string | null;
  created_at: number;
}

function baseHeaders(row: FileRow): Record<string, string> {
  const safeName = row.name.replace(/["\\\r\n]/g, "_");
  const encodedName = encodeURIComponent(row.name);
  const type = resolveServeMime(row.name, row.mime);
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
  if (type.startsWith("video/") || type.startsWith("audio/") || (type.startsWith("image/") && type !== "image/svg+xml")) return headers;
  headers["Content-Security-Policy"] = "sandbox";
  return headers;
}

function streamBody(path: string, start?: number, end?: number): ReadableStream {
  const nodeStream = createReadStream(path, start !== undefined && end !== undefined ? { start, end } : {});
  nodeStream.on("error", () => nodeStream.destroy());
  return Readable.toWeb(nodeStream) as ReadableStream;
}

function parseRange(range: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    if (suffix >= size) start = 0;
    else start = size - suffix;
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end < start || start >= size) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

async function loadRow(id: string): Promise<{ row: FileRow; size: number } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const row = db.prepare("SELECT id, discord_id, name, size, mime, created_at FROM files WHERE id = ?").get(id) as FileRow | undefined;
  if (!row) return null;
  const path = join("data/uploads", row.id);
  let size: number;
  try {
    size = (await stat(path)).size;
  } catch {
    return null;
  }
  return { row, size };
}

export const GET: APIRoute = async ({ params, request }) => {
  const loaded = await loadRow(params.id ?? "");
  if (!loaded) return new Response("Not found", { status: 404 });
  const { row, size } = loaded;
  const path = join("data/uploads", row.id);
  const headers = baseHeaders(row);

  const range = request.headers.get("range");
  if (range) {
    const parsed = parseRange(range, size);
    if (parsed) {
      headers["Content-Range"] = `bytes ${parsed.start}-${parsed.end}/${size}`;
      headers["Content-Length"] = String(parsed.end - parsed.start + 1);
      return new Response(streamBody(path, parsed.start, parsed.end), {
        status: 206,
        headers,
      });
    }
    if (/^bytes=\d*-\d*$/.test(range.trim())) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  headers["Content-Length"] = String(size);
  return new Response(streamBody(path), { headers });
};

export const HEAD: APIRoute = async ({ params }) => {
  const loaded = await loadRow(params.id ?? "");
  if (!loaded) return new Response(null, { status: 404 });
  const { row, size } = loaded;
  const headers = baseHeaders(row);
  headers["Content-Length"] = String(size);
  return new Response(null, { headers });
};
