interface UploadResponse {
  url: string;
}

interface QueueRow {
  bar: HTMLDivElement;
  status: HTMLSpanElement;
  actions: HTMLDivElement;
  markDone: (url: string) => void;
  markFailed: () => void;
}

interface UploadPageElements {
  dropZone: HTMLLabelElement | null;
  fileInput: HTMLInputElement | null;
  queueWrap: HTMLDivElement | null;
  queueCount: HTMLSpanElement | null;
  queueClear: HTMLButtonElement | null;
  preview: HTMLUListElement | null;
  errorBox: HTMLDivElement | null;
  errorText: HTMLParagraphElement | null;
}

type UploadableFiles = FileList | File[] | null | undefined;

const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const CHECK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-ctp-green"><path d="M20 6 9 17l-5-5"/></svg>';
const OPEN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
const FILE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';

const ACTION_BUTTON_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-md text-ctp-subtext0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text";

function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function hasFiles(event: DragEvent): boolean {
  return (event.dataTransfer?.items ? Array.from(event.dataTransfer.items) : []).some(
    (item) => item.kind === "file",
  );
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function uploadOne(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.addEventListener("progress", (event: ProgressEvent) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((JSON.parse(xhr.responseText) as UploadResponse).url);
        } catch {
          reject(new Error("bad server response"));
        }
      } else {
        reject(new Error(xhr.responseText || `upload failed (${xhr.status})`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("network error")));
    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export function initUploadPage(): void {
  const el: UploadPageElements = {
    dropZone: getElement<HTMLLabelElement>("drop-zone"),
    fileInput: getElement<HTMLInputElement>("file-input"),
    queueWrap: getElement<HTMLDivElement>("queue-wrap"),
    queueCount: getElement<HTMLSpanElement>("queue-count"),
    queueClear: getElement<HTMLButtonElement>("queue-clear"),
    preview: getElement<HTMLUListElement>("preview"),
    errorBox: getElement<HTMLDivElement>("upload-error"),
    errorText: getElement<HTMLParagraphElement>("upload-error-text"),
  };

  let dragDepth = 0;
  let uploading = false;
  let totalCount = 0;
  let doneCount = 0;

  function showError(message: string): void {
    if (!el.errorBox || !el.errorText) return;
    el.errorText.textContent = message;
    el.errorBox.classList.remove("hidden");
    el.errorBox.classList.add("flex");
  }

  function clearError(): void {
    if (!el.errorBox || !el.errorText) return;
    el.errorText.textContent = "";
    el.errorBox.classList.add("hidden");
    el.errorBox.classList.remove("flex");
  }

  function setDragging(active: boolean): void {
    el.dropZone?.classList.toggle("border-ctp-green", active);
    el.dropZone?.classList.toggle("bg-ctp-surface1", active);
  }

  function updateCount(): void {
    el.queueWrap?.classList.remove("hidden");
    if (el.queueCount) el.queueCount.textContent = `${doneCount}/${totalCount}`;
  }

  function addRow(file: File): QueueRow | null {
    if (!el.preview) return null;
    const list = el.preview;

    const row = document.createElement("li");
    row.className =
      "flex w-full items-center gap-3 rounded-lg border border-ctp-surface1 bg-ctp-surface0 px-3 py-2.5 text-left text-sm";
    row.dataset.done = "0";

    const thumb = document.createElement(file.type.startsWith("image/") ? "img" : "span");
    if (thumb instanceof HTMLImageElement) {
      thumb.src = URL.createObjectURL(file);
      thumb.alt = "";
      thumb.className = "h-10 w-10 shrink-0 rounded-md object-cover";
      thumb.addEventListener("load", () => URL.revokeObjectURL(thumb.src), { once: true });
    } else {
      thumb.className =
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ctp-surface1 text-ctp-subtext0";
      thumb.innerHTML = FILE_ICON;
    }

    const middle = document.createElement("div");
    middle.className = "min-w-0 flex-1";
    const top = document.createElement("div");
    top.className = "flex items-baseline justify-between gap-2";
    const name = document.createElement("span");
    name.className = "min-w-0 flex-1 truncate font-normal text-ctp-text";
    name.textContent = file.name;
    name.title = file.name;
    const status = document.createElement("span");
    status.className = "shrink-0 font-normal text-ctp-subtext0";
    status.textContent = "0%";
    top.append(name, status);
    const track = document.createElement("div");
    track.className = "mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ctp-surface1";
    const bar = document.createElement("div");
    bar.className = "h-full w-0 rounded-full bg-ctp-green transition-[width]";
    bar.style.width = "0%";
    track.append(bar);
    const sub = document.createElement("p");
    sub.className = "mt-1 truncate text-xs font-normal text-ctp-subtext0";
    sub.textContent = formatSize(file.size);
    middle.append(top, track, sub);

    const actions = document.createElement("div");
    actions.className = "hidden shrink-0 items-center gap-1";

    row.append(thumb, middle, actions);
    list.append(row);
    updateCount();

    function markDone(url: string): void {
      row.dataset.done = "1";
      bar.style.width = "100%";
      status.textContent = "done";
      status.classList.replace("text-ctp-subtext0", "text-ctp-green");
      sub.innerHTML = "";

      const open = document.createElement("a");
      open.href = url;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.title = "open file";
      open.className = ACTION_BUTTON_CLASS;
      open.innerHTML = OPEN_ICON;

      const copy = document.createElement("button");
      copy.type = "button";
      copy.title = "copy link";
      copy.className = ACTION_BUTTON_CLASS;
      copy.innerHTML = COPY_ICON;

      open.addEventListener("click", (event: MouseEvent) => event.stopPropagation());
      copy.addEventListener("click", (event: MouseEvent) => {
        event.stopPropagation();
        void (async (): Promise<void> => {
          try {
            await navigator.clipboard.writeText(new URL(url, window.location.origin).href);
            copy.innerHTML = CHECK_ICON;
            window.setTimeout(() => {
              copy.innerHTML = COPY_ICON;
            }, 1500);
          } catch {
            showError("could not copy link to clipboard.");
          }
        })();
      });

      actions.append(open, copy);
      actions.classList.remove("hidden");
      actions.classList.add("flex");
      row.classList.add("cursor-pointer", "hover:border-ctp-overlay0");
      row.addEventListener("click", () => window.open(url, "_blank"));
    }

    function markFailed(): void {
      row.dataset.done = "1";
      bar.classList.replace("bg-ctp-green", "bg-ctp-red");
      status.textContent = "failed";
      status.classList.replace("text-ctp-subtext0", "text-ctp-red");
    }

    return { bar, status, actions, markDone, markFailed };
  }

  async function uploadFiles(files: UploadableFiles): Promise<void> {
    if (!files || files.length === 0 || uploading) return;
    clearError();
    uploading = true;
    totalCount += files.length;
    updateCount();

    for (const file of Array.from(files)) {
      const row = addRow(file);
      if (!row) continue;
      try {
        const url = await uploadOne(file, (pct: number) => {
          row.bar.style.width = `${pct}%`;
          row.status.textContent = `${pct}%`;
        });
        row.markDone(url);
      } catch (err) {
        row.markFailed();
        showError(err instanceof Error ? err.message : `upload failed for "${file.name}".`);
      } finally {
        doneCount += 1;
        updateCount();
      }
    }

    uploading = false;
    if (el.fileInput) el.fileInput.value = "";
  }

  el.queueClear?.addEventListener("click", () => {
    el.preview?.querySelectorAll('li[data-done="1"]').forEach((item: Element) => item.remove());
    if (el.preview && el.preview.children.length === 0) {
      el.queueWrap?.classList.add("hidden");
      totalCount = 0;
      doneCount = 0;
    }
  });

  el.dropZone?.addEventListener("dragenter", (event: DragEvent) => {
    event.preventDefault();
    dragDepth += 1;
    setDragging(true);
  });

  el.dropZone?.addEventListener("dragover", (event: DragEvent) => event.preventDefault());

  el.dropZone?.addEventListener("dragleave", (event: DragEvent) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) setDragging(false);
  });

  el.dropZone?.addEventListener("drop", (event: DragEvent) => {
    event.preventDefault();
    dragDepth = 0;
    setDragging(false);
    void uploadFiles(event.dataTransfer?.files);
  });

  window.addEventListener("dragover", (event: DragEvent) => {
    if (hasFiles(event)) event.preventDefault();
  });

  window.addEventListener("drop", (event: DragEvent) => {
    if (hasFiles(event)) event.preventDefault();
  });

  el.fileInput?.addEventListener("change", () => {
    if (el.fileInput) void uploadFiles(el.fileInput.files);
  });
}

initUploadPage();
