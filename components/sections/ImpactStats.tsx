import { Reveal } from "@/components/motion/Reveal";
import type { ImpactMetric } from "@/lib/cms";

/**
 * Impact statistics.
 *
 * The hard design problem this solves: 800+, 5 and 0 have to sit in the same
 * component without the small numbers looking like failures. AAC's own value
 * is Integrity — "we will be honest about what we have achieved, what we have
 * not achieved". So:
 *
 *   - a metric with a value renders it exactly as supplied ("5", never "5+")
 *   - a metric with a methodology note explains itself in place
 *   - a metric with no value renders "Measurement in progress" — not a zero,
 *     not a guess, not a hidden row
 */
function formatAsOf(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function Stat({ m, tier }: { m: ImpactMetric; tier: 1 | 2 }) {
  const unmeasured = m.value_display === null && m.value_numeric === null;

  if (tier === 1) {
    return (
      <div className="border-t border-[var(--color-border-default)] pt-6">
        <p className="font-display text-[clamp(2.5rem,1.8rem+2.6vw,4rem)] leading-none text-[var(--color-text-display)]">
          {m.value_display ?? "—"}
        </p>
        <p className="mt-3 text-body text-[var(--color-text-primary)]">{m.label}</p>
        {m.as_of && <p className="mono mt-2">as of {formatAsOf(m.as_of)}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-5">
      <p
        className={
          unmeasured
            ? "text-caption font-medium text-[var(--color-text-secondary)]"
            : "font-display text-[2rem] leading-none text-[var(--color-text-display)]"
        }
      >
        {unmeasured ? "Measurement in progress" : m.value_display}
      </p>
      <p className="mt-2.5 text-caption text-[var(--color-text-primary)]">{m.label}</p>
      {m.methodology_note && (
        <p className="mt-2 text-caption leading-caption text-[var(--color-text-secondary)]">
          {m.methodology_note}
        </p>
      )}
    </div>
  );
}

export function ImpactStats({ metrics }: { metrics: ImpactMetric[] }) {
  if (metrics.length === 0) return null;

  const headline = metrics.filter((m) => m.is_headline).slice(0, 4);
  const rest = metrics.filter((m) => !m.is_headline);

  return (
    <section className="section bg-[var(--color-surface-page-alt)]">
      <div className="wrap">
        <Reveal>
          <p className="mono mb-4">Our impact</p>
          <h2 className="display max-w-[16ch] text-[clamp(2.125rem,1.43rem+2.86vw,4rem)]">
            What we can show you
          </h2>
          <p className="measure mt-6 text-body-l text-[var(--color-text-secondary)]">
            We measure ourselves by the difference our work makes. These are the real
            numbers — including the ones we are not yet proud of, and the ones we
            cannot count properly yet.
          </p>
        </Reveal>

        {headline.length > 0 && (
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {headline.map((m, i) => (
              <Reveal key={m.key} delay={i * 0.08}>
                <Stat m={m} tier={1} />
              </Reveal>
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((m, i) => (
              <Reveal key={m.key} delay={i * 0.05}>
                <Stat m={m} tier={2} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
