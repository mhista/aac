import type { MediaRef } from "@/lib/cms";

/**
 * A person's photograph, with a designed fallback.
 *
 * Deliberately not the `Img` component: team photographs live in /public/team
 * rather than in the build-time image manifest, so routing them through
 * ImageKit would ask the CDN for files that were never uploaded there. They
 * are small enough (60–160KB at 900×1125) to serve straight from the edge.
 *
 * The fallback matters more than it looks. A board of ten where three have no
 * photograph yet must not render three empty holes — the grid would read as
 * broken rather than incomplete. A monogram keeps every card the same height
 * and the same weight, so a missing picture looks like a deliberate choice
 * until the real one arrives.
 */
export function Avatar({
  name,
  photo,
  className = "",
  sizes = "280px",
  priority = false,
}: {
  name: string;
  photo?: MediaRef | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const initials = name
    .replace(/^(Rev\.|Fr\.|Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`relative overflow-hidden bg-[var(--color-violet-100)] ${className}`}
      style={{ aspectRatio: "4/5" }}
    >
      {photo?.url ? (
        <img
          src={photo.url}
          alt={photo.alt || name}
          width={photo.width ?? 900}
          height={photo.height ?? 1125}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-display text-[2.75rem] leading-none text-[var(--color-violet-700)] opacity-70"
        >
          {initials}
        </span>
      )}
    </div>
  );
}
