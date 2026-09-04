"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { updateAsset, deleteAsset } from "@/lib/cms/media";
import { prettyBytes } from "@/lib/media/upload";
import { MediaUploader } from "./MediaUploader";
import { BTN, Field, inputCls, Notice, EmptyPanel, fmtDate } from "./ui";
import { Close } from "@/components/ui/Icon";
import { ConfirmDelete } from "./ConfirmDelete";

/**
 * Media library.
 *
 * A grid, not a table: you find a photograph by looking at it. The one piece
 * of metadata shown on the tile is whether it still needs a description,
 * because that is the only thing about a file that blocks publishing.
 *
 * "Needs describing" is a first-class filter rather than a nag. Thirty photos
 * arrive from a screening at once and get described afterwards, in one sitting
 * — that is the real workflow, so the tool should have a screen for it.
 */

type Asset = {
  id: string;
  kind: string;
  url: string;
  filename: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt_text: string;
  caption: string | null;
  credit: string | null;
  tags: string[];
  folder: string | null;
  consent_on_file: boolean;
  created_at: string;
};

export function MediaLibrary({
  assets,
  undescribed,
  filter,
  canDelete,
}: {
  assets: Asset[];
  undescribed: number;
  filter: { kind: string; needs: string };
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work." });
      if (res.ok) setOpenId(null);
      router.refresh();
    });

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter(
      (a) =>
        a.filename?.toLowerCase().includes(needle) ||
        a.alt_text?.toLowerCase().includes(needle) ||
        a.caption?.toLowerCase().includes(needle) ||
        a.tags?.some((t) => t.toLowerCase().includes(needle))
    );
  }, [assets, q]);

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams();
    const next = { ...filter, [key]: value };
    if (next.kind && next.kind !== "all") p.set("kind", next.kind);
    if (next.needs) p.set("needs", next.needs);
    router.push(`/dashboard/media${p.toString() ? `?${p}` : ""}`);
  };

  const open = shown.find((a) => a.id === openId) ?? null;

  return (
    <div className="space-y-6">
      {msg && <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice>}

      {undescribed > 0 && filter.needs !== "alt" && (
        <Notice tone="warning" title={`${undescribed} file${undescribed === 1 ? "" : "s"} still need a description`}>
          A photograph without alt text cannot go on a published page — events are blocked from
          review until every picture has one.{" "}
          <button
            type="button"
            onClick={() => setParam("needs", "alt")}
            className="underline underline-offset-2"
          >
            Describe them now
          </button>
          .
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {[
          ["all", "Everything"],
          ["image", "Photographs"],
          ["video", "Video"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setParam("kind", k)}
            className={`mono rounded-pill px-3 py-1.5 transition-colors ${
              filter.kind === k
                ? "bg-[var(--color-action-primary)] text-white"
                : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setParam("needs", filter.needs === "alt" ? "" : "alt")}
          className={`mono rounded-pill px-3 py-1.5 transition-colors ${
            filter.needs === "alt"
              ? "bg-[var(--color-action-primary)] text-white"
              : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
          }`}
        >
          Needs describing
        </button>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search descriptions, filenames, tags"
          aria-label="Search media"
          className={`${inputCls} ml-auto max-w-[300px]`}
        />
        <button type="button" onClick={() => setUploading((v) => !v)} className={BTN.primary}>
          {uploading ? "Done" : "Upload"}
        </button>
      </div>

      {uploading && (
        <MediaUploader
          folder="/library"
          label="Add to the library"
          hint="Photographs or video from your phone or computer. They appear below as they finish — add descriptions afterwards."
          onUploaded={() => router.refresh()}
        />
      )}

      {shown.length === 0 ? (
        <EmptyPanel
          title={q || filter.needs ? "Nothing matches" : "The library is empty"}
          body={
            q || filter.needs
              ? "Try a different search, or clear the filters."
              : "Anything uploaded here — or anywhere else in the dashboard, like photographs on an event — appears in this library and can be reused."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setOpenId(a.id)}
                className="group block w-full overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white text-left"
              >
                <span className="relative block bg-[var(--color-violet-100)]" style={{ aspectRatio: "4/3" }}>
                  {a.kind === "video" ? (
                    <video
                      src={a.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt={a.alt_text || ""}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {!a.alt_text && (
                    <span
                      className="mono absolute left-2 top-2 rounded-pill px-2 py-0.5"
                      style={{
                        background: "var(--color-feedback-warning-surface)",
                        color: "var(--color-feedback-warning-text)",
                      }}
                    >
                      Needs describing
                    </span>
                  )}
                  {a.kind === "video" && (
                    <span className="mono absolute right-2 top-2 rounded-pill bg-black/60 px-2 py-0.5 text-white">
                      Video
                    </span>
                  )}
                </span>
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-[12px] text-[var(--color-text-primary)]">
                    {a.alt_text || a.filename || "Untitled"}
                  </span>
                  <span className="mono mt-0.5 block">
                    {a.width && a.height ? `${a.width}×${a.height}` : a.kind}
                    {a.size_bytes ? ` · ${prettyBytes(a.size_bytes)}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Detail
          asset={open}
          pending={pending}
          canDelete={canDelete}
          onClose={() => setOpenId(null)}
          onSave={(fd) => run(() => updateAsset(open.id, fd))}
          onDelete={() => run(() => deleteAsset(open.id))}
        />
      )}
    </div>
  );
}

/* ── Detail panel ─────────────────────────────────────────────────── */
function Detail({
  asset,
  pending,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  asset: Asset;
  pending: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (fd: FormData) => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={asset.alt_text || asset.filename || "Media"}
      data-lenis-prevent
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto overscroll-contain bg-[rgba(23,11,48,.5)] p-4 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[860px] overflow-hidden rounded-dash-md bg-white">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-3">
          <p className="mono truncate">{asset.filename ?? "Media"}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-dash-sm hover:bg-[var(--color-surface-page-alt)]"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-dash-sm bg-[var(--color-violet-100)]">
            {asset.kind === "video" ? (
              <video src={asset.url} controls playsInline className="h-full w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.alt_text || ""} className="h-full w-full object-contain" />
            )}
          </div>

          <form action={onSave} className="space-y-4">
            <Field
              label="Description"
              required
              htmlFor={`alt-${asset.id}`}
              hint="What is in the picture, for someone who cannot see it. One sentence."
            >
              <textarea
                id={`alt-${asset.id}`}
                name="alt_text"
                rows={3}
                defaultValue={asset.alt_text}
                className={inputCls}
                placeholder="Students seated during a cancer education session at UNN"
              />
            </Field>

            <Field label="Caption" htmlFor={`cap-${asset.id}`} hint="Optional. Shown under the image.">
              <input id={`cap-${asset.id}`} name="caption" defaultValue={asset.caption ?? ""} className={inputCls} />
            </Field>

            <Field label="Credit" htmlFor={`cr-${asset.id}`} hint="Who took it.">
              <input id={`cr-${asset.id}`} name="credit" defaultValue={asset.credit ?? ""} className={inputCls} />
            </Field>

            <Field label="Tags" htmlFor={`tg-${asset.id}`} hint="Comma separated — screening, UNN, 2026.">
              <input id={`tg-${asset.id}`} name="tags" defaultValue={asset.tags?.join(", ") ?? ""} className={inputCls} />
            </Field>

            <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                name="consent_on_file"
                defaultChecked={asset.consent_on_file}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-action-primary)]"
              />
              The people in this picture agreed to it being published
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="submit" disabled={pending} className={BTN.primary}>Save</button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(asset.url).then(
                    () => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    },
                    () => undefined
                  );
                }}
                className={BTN.secondary}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              {canDelete && (
                <div className="ml-auto">
                  <ConfirmDelete
                    compact
                    icon
                    what={asset.filename ?? "this file"}
                    consequence="It is removed from the library and from storage. Anything still using it will be refused."
                    action={async () => { onDelete(); }}
                  />
                </div>
              )}
            </div>

            <p className="mono pt-1">
              Added {fmtDate(asset.created_at)}
              {asset.folder ? ` · ${asset.folder}` : ""}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
