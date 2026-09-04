import { Button } from "./Button";

/**
 * The empty state.
 *
 * This is a first-class screen, not a fallback. AAC ships with real content or
 * nothing — never demo data — so this is what a visitor sees on a section
 * whose data hasn't arrived. It has to look deliberate: honest about being
 * empty, and useful about what happens next.
 */
export function Empty({
  title,
  body,
  cta,
  compact = false,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] text-center ${
        compact ? "px-6 py-12" : "px-6 py-20 md:py-28"
      }`}
    >
      {/* Ribbon motif, barely there */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid place-items-center opacity-[.06]"
      >
        <img src="/aac-icon-512.png" alt="" className="w-[220px] max-w-[45%]" />
      </span>

      <div className="relative mx-auto max-w-[46ch]">
        <h3 className="font-display text-[1.75rem] leading-heading text-[var(--color-text-display)]">
          {title}
        </h3>
        <p className="mt-3 text-caption leading-body text-[var(--color-text-secondary)]">{body}</p>
        {cta && (
          <div className="mt-7">
            <Button href={cta.href} variant="secondary" size="md" arrow>
              {cta.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
