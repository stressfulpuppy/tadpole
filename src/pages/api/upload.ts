import type { APIRoute } from "astro";
import Busboy from "busboy";
import { createWriteStream, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import db from "../../server/db";
import { validateSession, getPublicOrigin } from "../../server/session";

const MAX_SIZE = 256 * 1024 * 1024;
const UNALLOWED_EXTENSIONS = new Set(["exe", "scr", "cpl", "jar", "bat", "cmd", "com", "msi", "ps1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "reg", "lnk", "doc", "docx"]);

class UploadError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function streamUpload(body: ReadableStream<Uint8Array>, contentType: string, dest: string): Promise<{ filename: string; mime: string; size: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: unknown) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    let bb: Busboy;
    try {
      bb = Busboy({ headers: { "content-type": contentType }, limits: { fileSize: MAX_SIZE, fields: 20, parts: 21 } });
    } catch {
      fail(new UploadError(400, "Invalid upload form"));
      return;
    }

    let fileSeen = false;
    let filename = "";
    let mime = "";
    let size = 0;
    let truncated = false;
    let outError: unknown = null;
    let bbClosed = false;
    let outClosed = false;

    const tryFinish = () => {
      if (settled || !bbClosed) return;
      if (fileSeen && !outClosed) return;
      settled = true;
      if (outError) return reject(outError);
      if (!fileSeen) return reject(new UploadError(400, "No file uploaded"));
      if (truncated || size > MAX_SIZE) return reject(new UploadError(413, "File exceeds the 256 MiB limit"));
      if (size === 0) return reject(new UploadError(400, "No file uploaded"));
      resolve({ filename, mime, size });
    };

    bb.on("file", (name, stream, info) => {
      if (name !== "file" || fileSeen) {
        stream.resume();
        return;
      }
      fileSeen = true;
      filename = info.filename;
      mime = info.mimeType;
      const out = createWriteStream(dest);
      out.on("error", (err) => {
        outError = err;
      });
      out.on("close", () => {
        outClosed = true;
        tryFinish();
      });
      stream.on("limit", () => {
        truncated = true;
      });
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
      });
      stream.on("error", fail);
      stream.pipe(out);
    });

    bb.on("error", fail);
    bb.on("close", () => {
      bbClosed = true;
      tryFinish();
    });

    const src = Readable.fromWeb(body as unknown as import("node:stream/web").ReadableStream);
    src.on("error", fail);
    src.pipe(bb);
  });
}

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

  if (!request.body) {
    return new Response("No file uploaded", {
      status: 400,
    });
  }

  const storageKey = crypto.randomUUID();
  const now = Date.now();
  const dest = join("data/uploads", storageKey);

  mkdirSync("data/uploads", { recursive: true });

  try {
    const { filename, mime, size } = await streamUpload(request.body, contentType, dest);

    if (filename.length > 255 || /[\0-\x1f\x7f/\\:]/.test(filename) || filename === "." || filename === ".." || filename.startsWith(".")) {
      throw new UploadError(400, "Invalid filename");
    }

    const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase() : "";

    if (UNALLOWED_EXTENSIONS.has(extension)) {
      throw new UploadError(415, "Unsupported file extension");
    }

    db.prepare("INSERT INTO files (id, discord_id, name, size, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(storageKey, session.discord_id, filename, size, mime || null, now);

    return Response.json({
      success: true,
      id: storageKey,
      name: filename,
      size: size,
      type: mime,
      url: new URL(`/f/${storageKey}`, getPublicOrigin(request, clientAddress)).toString(),
    });
  } catch (err) {
    rmSync(dest, { force: true });
    if (err instanceof UploadError) {
      return new Response(err.message, { status: err.status });
    }
    console.error("Upload failed:", err);
    return new Response("Upload failed", { status: 500 });
  }
};
