import { Reveal } from "@/components/motion/Reveal";

/**
 * Inner-page hero. Editorial, no photograph — a big display title over paper,
 * with a thin rule beneath. Deliberately quieter than the home hero so the
 * homepage keeps its impact, and it means an inner page never waits on an image.
 *
 * `aside` sits opposite the title on desktop — used for filters and counts.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  aside,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  aside?: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--color-border-default)] pt-32 md:pt-40">
      <div className="wrap pb-10 md:pb-14">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-[52ch]">
              {eyebrow && <p className="mono mb-4">{eyebrow}</p>}
              <h1 className="display text-[clamp(2.5rem,1.7rem+3.4vw,4.5rem)]">{title}</h1>
              {lede && (
                <p className="measure mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">
                  {lede}
                </p>
              )}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
