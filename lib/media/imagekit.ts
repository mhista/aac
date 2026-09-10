import manifest from "@/lib/media/manifest.json";

const ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

/**
 * ImageKit is opt-in, not automatic.
 *
 * Setting the endpoint alone is not enough — the files also have to exist there,
 * and if they don't, every image on the site 404s while looking correctly
 * configured. So delivery only switches to the CDN when this is explicitly
 * turned on, which should happen after `npm run upload:images` succeeds.
 *
 * Off  → /img/<file>            (local, always works)
 * On   → ImageKit with transforms (AVIF/WebP, responsive, CDN)
 */
const USE_IK = process.env.NEXT_PUBLIC_IMAGEKIT_ENABLED === "true" && ENDPOINT !== "";

export type LocalImageKey = keyof typeof manifest;

/**
 * Build an ImageKit URL with transforms.
 * Falls back to the local /img path when ImageKit isn't configured, so the
 * site works in development and during the first deploy.
 */
/**
 * Is this already a finished address rather than a manifest filename?
 *
 * THE BUG THIS EXISTS TO PREVENT. `ik()` was written when every image on the
 * site was a build-time file named in the manifest — "hero-community.jpg" —
 * so gluing "/img/" in front of whatever it was given was always right. Then
 * the media library arrived, and a cover uploaded through the dashboard is
 * stored as a complete URL. Passing one of those through produced
 * `/img/https://ik.imagekit.io/aac/cover.jpg`, which 404s, and the page showed
 * the alt text on an empty box.
 *
 * The same applies to anything already rooted at a path — /team/ada.jpg,
 * /og-default.jpg — which exist in /public and are not manifest entries.
 */
function isResolved(path: string) {
  return /^(https?:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:");
}

function transforms(opts: { w?: number; h?: number; q?: number; focus?: string; blur?: number }) {
  return [
    opts.w && `w-${opts.w}`,
    opts.h && `h-${opts.h}`,
    `q-${opts.q ?? 80}`,
    "f-auto",
    opts.h && opts.w ? "c-maintain_ratio" : null,
    opts.focus && `fo-${opts.focus}`,
    opts.blur && `bl-${opts.blur}`,
  ]
    .filter(Boolean)
    .join(",");
}

export function ik(
  path: string,
  opts: { w?: number; h?: number; q?: number; focus?: string; blur?: number } = {}
) {
  if (!path) return "";
  const t = transforms(opts);

  if (isResolved(path)) {
    /* An ImageKit URL can still be resized — through the query parameter
       rather than the /tr: path segment, because that works wherever the
       filename sits in the URL and cannot corrupt a path we did not build. */
    if (/(^|\.)imagekit\.io\//i.test(path)) {
      return path.includes("?") ? `${path}&tr=${t}` : `${path}?tr=${t}`;
    }
    /* Somebody else's URL. Serve it exactly as given. */
    return path;
  }

  /* A path already rooted in /public — /team/ada.jpg, /og-default.jpg. */
  if (path.startsWith("/")) return path;

  const clean = path.replace(/^\//, "");
  if (!USE_IK) return `/img/${clean}`;
  return `${ENDPOINT.replace(/\/$/, "")}/tr:${t}/${clean}`;
}

/** Look up a seeded editorial image by key. Returns null if absent. */
export function localImage(key: string) {
  const m = (manifest as Record<string, { file: string; w: number; h: number; alt: string; lqip: string }>)[key];
  if (!m) return null;
  return { path: m.file, alt: m.alt, width: m.w, height: m.h, lqip: m.lqip };
}

/** Responsive srcset across the breakpoints the design uses. */
export function srcSet(path: string, widths = [640, 828, 1080, 1440, 1920, 2560]) {
  if (!path) return undefined;

  /* An ImageKit URL resizes on demand whatever the site-wide flag says — the
     file is demonstrably there, because that is where the URL came from. */
  if (/(^|\.)imagekit\.io\//i.test(path)) {
    return widths.map((w) => `${ik(path, { w })} ${w}w`).join(", ");
  }

  /* One physical file: a width-descriptor srcset would tell the browser there
     are six sizes to choose between when there is one, and it would pick
     arbitrarily. Better to say nothing. */
  if (isResolved(path) || path.startsWith("/")) return undefined;
  if (!USE_IK) return undefined;

  return widths.map((w) => `${ik(path, { w })} ${w}w`).join(", ");
}
