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
export function ik(
  path: string,
  opts: { w?: number; h?: number; q?: number; focus?: string; blur?: number } = {}
) {
  const t = [
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
  // Without ImageKit there is only one physical file, so a width-descriptor
  // srcset would lie to the browser and make it pick arbitrarily.
  if (!USE_IK) return undefined;
  return widths.map((w) => `${ik(path, { w })} ${w}w`).join(", ");
}
