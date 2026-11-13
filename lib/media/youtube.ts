/**
 * YouTube links → video ids, embeds and thumbnails.
 *
 * Videos are not uploaded to this site. They go to AAC's YouTube channel and
 * the site shows them from there: a phone video is hundreds of megabytes, and
 * YouTube transcodes it for every connection and screen size for free, which
 * our own storage never would. So anywhere a video can appear, what is stored
 * is simply the YouTube link someone pasted.
 *
 * Pure string work with no imports, so it is safe on the server, in the
 * browser and in middleware alike.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The 11-character video id from any ordinary YouTube link, or null.
 *
 * Accepts what people actually paste: the share link (youtu.be/…), the
 * address bar (youtube.com/watch?v=…, with or without m. or www.), Shorts,
 * live streams and embed links. Anything else is null, so a link to some
 * other site is never mistaken for a video.
 */
export function youTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
  }

  return id && ID.test(id) ? id : null;
}

export const isYouTube = (url: string | null | undefined) => youTubeId(url) !== null;

/**
 * The privacy-enhanced player address. youtube-nocookie.com sets no tracking
 * cookies until the visitor presses play, which matters on a health charity's
 * site that otherwise sets none.
 */
export function youTubeEmbed(id: string, opts: { autoplay?: boolean } = {}) {
  const q = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (opts.autoplay) q.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${q}`;
}

/** YouTube's own still for the video. `hqdefault` exists for every video. */
export function youTubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** The normal watch link, for "open on YouTube". */
export function youTubeWatch(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
