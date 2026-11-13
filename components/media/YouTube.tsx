"use client";

import { useState } from "react";
import { youTubeEmbed, youTubeThumb, youTubeWatch } from "@/lib/media/youtube";

/**
 * A YouTube video, loaded only when someone presses play.
 *
 * A real YouTube iframe costs around a megabyte of script before anyone has
 * shown any interest in watching — on an article read over mobile data in
 * Nsukka that is the whole page budget several times over. So this renders
 * YouTube's thumbnail and a play button, and swaps in the player on click.
 * Until then nothing is requested from YouTube except one JPEG.
 *
 * The box keeps a 16:9 ratio from the first paint, so nothing shifts when the
 * player arrives.
 */
export function YouTube({
  id,
  title,
  className = "",
}: {
  id: string;
  /** What the video is. Read out by screen readers and shown under it. */
  title: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const label = title.trim() || "Video";

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[var(--color-violet-950,#1E0B45)] ${className}`}
      style={{ aspectRatio: "16/9" }}
    >
      {playing ? (
        <iframe
          src={youTubeEmbed(id, { autoplay: true })}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Play video: ${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youTubeThumb(id)}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity duration-hover group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 shadow-lg transition-transform duration-hover ease-entrance group-hover:scale-105">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-1 h-7 w-7 fill-[var(--color-action-primary,#4E23A0)]">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          </span>
        </button>
      )}
      <noscript>
        <a href={youTubeWatch(id)} className="absolute inset-0 grid place-items-center text-white underline">
          Watch on YouTube
        </a>
      </noscript>
    </div>
  );
}
