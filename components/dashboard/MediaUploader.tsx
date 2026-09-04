"use client";

import { useCallback, useRef, useState } from "react";
import { compressImage, isVideo, prettyBytes, uploadFile, type UploadResult } from "@/lib/media/upload";
import { recordAsset } from "@/lib/cms/media";
import { BTN, Notice } from "./ui";
import { Close } from "@/components/ui/Icon";

/**
 * The upload control. Used everywhere media is added.
 *
 * Written for someone standing outside a screening tent with 30 photos on
 * their phone and no idea what a CDN is. So:
 *
 * · Pick many at once, or drop them in. Not one at a time.
 * · Each file shows its own progress bar. On a slow connection, silence reads
 *   as failure and people force-quit halfway through.
 * · Two at a time, not thirty. Saturating a phone's uplink makes every upload
 *   slower and the first one no faster.
 * · One file failing never cancels the rest — a batch of 30 that stops dead at
 *   number 4 is worse than 29 successes and one clear error.
 * · "Shrink before uploading" is on by default, because a 9MB phone photo
 *   displays identically at a tenth the size, and off is one tap away for
 *   anything headed for print.
 */

type Item = {
  id: string;
  file: File;
  pct: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  result?: UploadResult;
};

const CONCURRENCY = 2;

export function MediaUploader({
  folder,
  accept = "image/*,video/*",
  onUploaded,
  label = "Add photographs",
  hint,
}: {
  folder: string;
  accept?: string;
  /** Called once per successful file, as it lands. */
  onUploaded: (r: UploadResult) => Promise<void> | void;
  label?: string;
  hint?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [compress, setCompress] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, next: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...next } : i)));

  const run = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const queued: Item[] = files.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        pct: 0,
        status: "queued",
      }));
      setItems((prev) => [...prev, ...queued]);
      setBusy(true);

      let cursor = 0;
      const worker = async () => {
        while (cursor < queued.length) {
          const item = queued[cursor++];
          patch(item.id, { status: "uploading" });
          try {
            const file = compress ? await compressImage(item.file) : item.file;
            const result = await uploadFile(file, {
              folder,
              onProgress: (pct) => patch(item.id, { pct }),
            });

            /* Every upload joins the shared library, wherever it was made
               from. A photograph added to an event is thereby reusable on a
               programme page without anyone hunting for the original. A
               failure here must not fail the upload — the file is safely on
               the CDN either way. */
            await recordAsset({
              url: result.url,
              fileId: result.fileId,
              filename: result.name,
              mime: result.fileType,
              width: result.width,
              height: result.height,
              size: result.size,
              folder,
            }).catch(() => undefined);

            patch(item.id, { status: "done", pct: 100, result });
            await onUploaded(result);
          } catch (e) {
            patch(item.id, {
              status: "error",
              error: e instanceof Error ? e.message : "Upload failed.",
            });
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queued.length) }, worker));
      setBusy(false);
    },
    [compress, folder, onUploaded]
  );

  const pick = (list: FileList | null) => {
    if (!list) return;
    run(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  };

  const failed = items.filter((i) => i.status === "error");
  const active = items.filter((i) => i.status !== "done");

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={`rounded-dash-md border-2 border-dashed px-5 py-8 text-center transition-colors ${
          dragging
            ? "border-[var(--color-border-brand)] bg-[var(--color-violet-100)]"
            : "border-[var(--color-border-default)] bg-white"
        }`}
      >
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="mx-auto mt-1.5 max-w-[46ch] text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          {hint ?? "Photographs or video, straight from your phone or computer. Pick as many as you like at once."}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="sr-only"
          id={`up-${folder}`}
          onChange={(e) => pick(e.target.files)}
        />
        <label htmlFor={`up-${folder}`} className={`${BTN.primary} mt-5 cursor-pointer`}>
          Choose files
        </label>

        <label className="mt-5 flex items-center justify-center gap-2.5 text-[12px] text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={compress}
            onChange={(e) => setCompress(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-action-primary)]"
          />
          Shrink photographs before uploading — much faster, and looks the same on the site
        </label>
      </div>

      {failed.length > 0 && (
        <Notice tone="danger" title={`${failed.length} did not upload`}>
          The rest went up fine. {failed[0].error}
        </Notice>
      )}

      {active.length > 0 && (
        <ul className="space-y-2">
          {active.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-3 rounded-dash-sm border border-[var(--color-border-default)] bg-white px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[var(--color-text-primary)]">
                  {i.file.name}
                </p>
                <p className="mono mt-0.5">
                  {isVideo(i.file) ? "Video" : "Photo"} · {prettyBytes(i.file.size)}
                  {i.status === "error" ? ` · ${i.error}` : ""}
                </p>
                {i.status !== "error" && (
                  <div
                    className="mt-1.5 h-1 overflow-hidden rounded-pill bg-[var(--color-neutral-paper-alt)]"
                    role="progressbar"
                    aria-valuenow={i.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Uploading ${i.file.name}`}
                  >
                    <div
                      className="h-full bg-[var(--color-action-primary)] transition-[width] duration-200"
                      style={{ width: `${i.pct}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="mono shrink-0">
                {i.status === "error" ? "Failed" : i.status === "uploading" ? `${i.pct}%` : "Waiting"}
              </span>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}
                className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label={`Dismiss ${i.file.name}`}
              >
                <Close className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <p className="mono">
          Uploading — you can keep filling in the rest of the page, but do not close this tab.
        </p>
      )}
    </div>
  );
}
