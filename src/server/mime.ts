const EXT_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  qt: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  flv: "video/x-flv",
  wmv: "video/x-ms-wmv",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  mpe: "video/mpeg",
  mp2: "video/mpeg",
  m2v: "video/mpeg",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  wtv: "video/x-ms-wtv",
  ts: "video/mp2t",
  mts: "video/mp2t",
  m2ts: "video/mp2t",
  m4s: "video/iso.segment",
  m3u8: "application/vnd.apple.mpegurl",
  mpd: "application/dash+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  m4b: "audio/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  opus: "audio/opus",
  weba: "audio/webm",
  wma: "audio/x-ms-wma",
  mka: "audio/x-matroska",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  caf: "audio/x-caf",
  amr: "audio/amr",
  "3ga": "audio/3gpp",
  mid: "audio/midi",
  midi: "audio/midi",
  png: "image/png",
  apng: "image/apng",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  pjpeg: "image/jpeg",
  pjp: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  jxl: "image/jxl",
  svg: "image/svg+xml",
  svgz: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  heics: "image/heic-sequence",
  heifs: "image/heif-sequence",
  vtt: "text/vtt; charset=utf-8",
  srt: "application/x-subrip",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json",
  xml: "application/xml",
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
};

export function mimeForFilename(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return null;
  return EXT_MIME[filename.slice(dot + 1).toLowerCase()] ?? null;
}

const PLAINTEXT = new Set(["html", "htm", "xhtml", "shtml", "shtm", "stm", "svg", "svgz", "xml", "xsl", "xslt", "dtd"]);

export function isPlaintextOnly(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return false;
  return PLAINTEXT.has(filename.slice(dot + 1).toLowerCase());
}

export function resolveServeMime(filename: string, stored: string | null): string {
  if (isPlaintextOnly(filename)) return "text/plain; charset=utf-8";
  const byExt = mimeForFilename(filename);
  if (byExt) return byExt;
  if (stored && stored !== "application/octet-stream") return stored;
  return "application/octet-stream";
}

export function normalizeUploadMime(filename: string, clientMime: string): string | null {
  if (isPlaintextOnly(filename)) return "text/plain; charset=utf-8";
  const byExt = mimeForFilename(filename);
  if (byExt) return byExt;
  const v = clientMime.trim();
  if (v && v !== "application/octet-stream") return v;
  return v || null;
}
