"use client";

import { useState } from "react";
import { youTubeId, youTubeThumb } from "@/lib/media/youtube";
import { BTN } from "./ui";

/**
 * "Paste a YouTube link" — the way video gets onto the site.
 *
 * Videos are not uploaded to our storage: they go to AAC's YouTube channel,
 * which streams them properly to every phone and connection, and the site
 * shows them from there. This field is the whole interface for that. The
 * link is checked as it is typed, and a thumbnail appears as soon as it is
 * recognised, so the person sees which video they are adding before they
 * add it.
 */
export function YouTubeAdd({
  onAdd,
  label = "Add a YouTube video",
  hint = "Upload the video to AAC's YouTube channel first, then press Share under it, copy the link and paste it here.",
  disabled = false,
}: {
  onAdd: (link: string) => Promise<{ ok: boolean; error?: string }> | void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = youTubeId(link);
  const typedSomething = link.trim().length > 0;

  async function add() {
    if (!id) return;
    setBusy(true);
    setError(null);
    const res = await onAdd(link.trim());
    setBusy(false);
    if (res && !res.ok) {
      setError(res.error ?? "That video could not be added.");
      return;
    }
    setLink("");
  }

  return (
    <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white px-5 py-5">
      <label htmlFor="yt-link" className="text-[14px] font-medium text-[var(--color-text-primary)]">
        {label}
      </label>
      <p className="mt-1.5 max-w-[60ch] text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{hint}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <input
          id="yt-link"
          type="url"
          inputMode="url"
          value={link}
          disabled={disabled || busy}
          onChange={(e) => {
            setLink(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="https://youtu.be/…"
          className="w-full rounded-dash-sm border border-[var(--color-border-default)] px-3 py-2.5 text-[14px] outline-none focus-visible:border-[var(--color-border-brand)]"
        />
        <button type="button" onClick={add} disabled={!id || disabled || busy} className={`${BTN.secondary} shrink-0`}>
          {busy ? "Adding…" : "Add video"}
        </button>
      </div>

      {id && (
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={youTubeThumb(id)} alt="" className="h-16 w-28 rounded-dash-xs object-cover" />
          <p className="text-[12px] text-[var(--color-text-secondary)]">Found it. Press “Add video”.</p>
        </div>
      )}
      {typedSomething && !id && (
        <p className="mt-2 text-[12px] text-[var(--color-feedback-danger-text)]">
          That is not a YouTube video link yet. It should look like youtu.be/… or youtube.com/watch?v=…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-[var(--color-feedback-danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
}
