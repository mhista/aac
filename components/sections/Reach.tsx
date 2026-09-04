import { Reveal } from "@/components/motion/Reveal";
import { ORG } from "@/lib/org";
import type { Chapter } from "@/lib/cms";

/**
 * Where we work. The map is decorative enhancement — the country list beside
 * it carries the same information as text, so meaning never rests on colour
 * or position alone.
 */
export function Reach({ chapters }: { chapters: Chapter[] }) {
  const byCountry = ORG.countries.map((c) => ({
    country: c,
    count: chapters.filter((ch) => ch.country === c).length,
  }));

  return (
    <section className="section">
      <div className="wrap grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="mono mb-4">Our reach</p>
          <h2 className="display max-w-[14ch] text-[clamp(2.125rem,1.43rem+2.86vw,4rem)]">
            Three countries. One movement.
          </h2>
          <p className="measure mt-6 text-body-l text-[var(--color-text-secondary)]">
            Cancer is too big for one organisation, one profession or one country.
            We are building a network that crosses all three.
          </p>

          <ul className="mt-10 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
            {byCountry.map(({ country, count }) => (
              <li key={country} className="flex items-baseline justify-between gap-6 py-4">
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--color-action-primary)]" />
                  <span className="font-display text-[1.5rem] text-[var(--color-text-display)]">{country}</span>
                </span>
                <span className="mono">
                  {count > 0 ? `${count} chapter${count === 1 ? "" : "s"}` : "Active"}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <p className="mono mb-3">Our community</p>
            <ul className="flex flex-wrap gap-2">
              {ORG.community.map((c) => (
                <li key={c} className="rounded-pill border border-[var(--color-border-default)] px-3 py-1.5 text-caption text-[var(--color-text-secondary)]">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="aac-map">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aac-africa.svg" alt="Map of Africa with Nigeria, Ghana and Kenya highlighted as countries where AAC is active." className="w-full" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
