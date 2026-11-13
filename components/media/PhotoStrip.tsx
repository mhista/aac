"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Img } from "@/components/media/Img";
import type { MediaRef } from "@/lib/cms";
import { ArrowLeft, ArrowRight, Close } from "@/components/ui/Icon";
import { youTubeEmbed, youTubeId, youTubeThumb } from "@/lib/media/youtube";

/**
 * Horizontal scrolling photo strip with a lightbox — the core of an event page.
 *
 * An item may also be a YouTube video (its url is the YouTube link — videos
 * live on AAC's channel, not in our storage). It shows YouTube's thumbnail
 * with a play badge in the strip, and plays in the lightbox. The player only
 * loads once the video is opened.
 *
 * Accessibility, because a gallery is where it usually gets dropped:
 *   - the strip is a real <ul> of <button>s, so it is keyboard reachable
 *   - the lightbox is a modal dialog: focus moves in, is trapped, and returns
 *     to the thumbnail that opened it
 *   - arrow keys move between photos, Escape closes
 *   - background scroll is locked while open
 */
export function PhotoStrip({ photos, title }: { photos: MediaRef[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(null);
    openerRef.current?.focus();
  }, []);

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : (i + d + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Tab") e.preventDefault(); // single focusable surface
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  if (photos.length === 0) return null;

  return (
    <>
      <ul
        className="flex gap-4 overflow-x-auto px-[var(--page-x)] pb-4 [scrollbar-width:thin]"
        aria-label={`Photographs from ${title}`}
      >
        {photos.map((p, i) => (
          <li key={i} className="shrink-0">
            <button
              type="button"
              onClick={(e) => {
                openerRef.current = e.currentTarget;
                setOpen(i);
              }}
              className="block overflow-hidden rounded-lg"
              aria-label={`Open ${youTubeId(p.url) ? "video" : "photograph"} ${i + 1} of ${photos.length}`}
            >
              {(() => {
                const video = youTubeId(p.url);
                if (!video) {
                  return (
                    <Img
                      src={p.url}
                      alt={p.alt}
                      ratio="3/2"
                      sizes="420px"
                      className="w-[min(78vw,520px)] transition-transform duration-hover ease-entrance hover:scale-[1.02]"
                    />
                  );
                }
                return (
                  <span
                    className="relative block w-[min(78vw,520px)] overflow-hidden bg-[#1E0B45]"
                    style={{ aspectRatio: "3/2" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={youTubeThumb(video)}
                      alt={p.alt}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-hover ease-entrance hover:scale-[1.02]"
                    />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-lg">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-1 h-6 w-6 fill-[#4E23A0]">
                          <path d="M8 5.5v13l11-6.5z" />
                        </svg>
                      </span>
                    </span>
                  </span>
                );
              })()}
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${youTubeId(photos[open].url) ? "Video" : "Photograph"} ${open + 1} of ${photos.length} from ${title}`}
          tabIndex={-1}
          className="fixed inset-0 z-[80] flex flex-col bg-[rgba(23,11,48,.96)] p-4 outline-none md:p-8"
          onClick={close}
        >
          <div className="flex items-center justify-between text-white">
            <p className="mono !text-white/70">
              {String(open + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid h-11 w-11 place-items-center rounded-pill hover:bg-white/10"
            >
              <Close className="h-5 w-5" />
            </button>
          </div>

          <div
            className="flex min-h-0 flex-1 items-center justify-center py-4"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const video = youTubeId(photos[open].url);
              if (video) {
                return (
                  <iframe
                    key={video}
                    src={youTubeEmbed(video, { autoplay: true })}
                    title={photos[open].alt || "Video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="aspect-video max-h-full w-full max-w-[min(100%,1200px)] rounded-lg border-0"
                  />
                );
              }
              return (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photos[open].url}
                  alt={photos[open].alt}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              );
            })()}
          </div>

          <div
            className="flex items-center justify-between gap-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => step(-1)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-pill px-4 text-caption hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
            <p className="text-caption text-white/70">{photos[open].alt}</p>
            <button
              type="button"
              onClick={() => step(1)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-pill px-4 text-caption hover:bg-white/10"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
