import type { APIRoute } from "astro";

const MAX_SIZE = 256 * 1024 * 1024;
const UNALLOWED_EXTENSIONS = new Set(["exe", "scr", "cpl", "jar", "bat", "cmd", "com", "msi", "ps1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "reg", "lnk", "doc", "docx"]);

export const POST: APIRoute = async ({ request }) => {
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

  // TODO: db shit uh oh

  return Response.json({
    success: true,
    id: storageKey,
    name: filename,
    size: file.size,
    type: file.type,
  });
};
