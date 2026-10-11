import type { APIRoute } from "astro";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import db from "../../utils/db";
import { validateSession, getPublicOrigin } from "../../utils/session";

const MAX_SIZE = 256 * 1024 * 1024;
const UNALLOWED_EXTENSIONS = new Set(["exe", "scr", "cpl", "jar", "bat", "cmd", "com", "msi", "ps1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "reg", "lnk", "doc", "docx"]);

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const session = validateSession(request, cookies, clientAddress);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!/^multipart\/form-data\s*(?:;|$)/i.test(contentType)) {
    return new Response("Expected multipart form data", {
      status: 415,
    });
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      return new Response("Invalid content length", {
        status: 400,
      });
    }

    if (Number(contentLength) > MAX_SIZE + 1024 * 1024) {
      return new Response("Request too large", {
        status: 413,
      });
    }
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return new Response("Invalid upload form", {
      status: 400,
    });
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return new Response("No file uploaded", {
      status: 400,
    });
  }

  if (file.size > MAX_SIZE) {
    return new Response("File exceeds the 256 MiB limit", {
      status: 413,
    });
  }

  const filename = file.name;

  if (filename.length > 255 || /[\0-\x1f\x7f/\\:]/.test(filename) || filename === "." || filename === ".." || filename.startsWith(".")) {
    return new Response("Invalid filename", {
      status: 400,
    });
  }

  const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase() : "";

  if (UNALLOWED_EXTENSIONS.has(extension)) {
    return new Response("Unsupported file extension", {
      status: 415,
    });
  }

  const storageKey = crypto.randomUUID();
  const now = Date.now();

  mkdirSync("data/uploads", { recursive: true });
  writeFileSync(join("data/uploads", storageKey), Buffer.from(await file.arrayBuffer()));

  db.prepare("INSERT INTO files (id, discord_id, name, size, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(storageKey, session.discord_id, filename, file.size, file.type || null, now);

  return Response.json({
    success: true,
    id: storageKey,
    name: filename,
    size: file.size,
    type: file.type,
    url: new URL(`/f/${storageKey}`, getPublicOrigin(request)).toString(),
  });
};
