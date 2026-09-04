import Link from "next/link";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { StackCards } from "@/components/motion/StackCards";
import { ORG } from "@/lib/org";
import { ArrowRight } from "@/components/ui/Icon";

const CATEGORY: Record<string, { label: string; surface: string; text: string }> = {
  awareness:  { label: "Awareness",  surface: "var(--color-category-awareness-surface)",  text: "var(--color-category-awareness-text)" },
  support:    { label: "Support",    surface: "var(--color-category-support-surface)",    text: "var(--color-category-support-text)" },
  prevention: { label: "Prevention", surface: "var(--color-category-prevention-surface)", text: "var(--color-category-prevention-text)" },
  research:   { label: "Research",   surface: "var(--color-category-research-surface)",   text: "var(--color-category-research-text)" },
  innovation: { label: "Innovation", surface: "var(--color-category-innovation-surface)", text: "var(--color-category-innovation-text)" },
};

function PillarCard({ pillar, index }: { pillar: (typeof ORG.pillars)[number]; index: number }) {
  const cat = CATEGORY[pillar.category];
  return (
    <Link
      href={`/what-we-do#${pillar.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-soft transition-shadow duration-hover ease-entrance hover:shadow-lift"
    >
      <div className="overflow-hidden">
        <Img
          src={pillar.image}
          ratio="3/2"
          sizes="(max-width:768px) 100vw, 50vw"
          imgClassName="transition-transform duration-[600ms] ease-entrance group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col p-6 md:p-7">
        <div className="flex items-center gap-3">
          <span className="mono !text-[var(--color-text-secondary)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className="mono inline-block rounded-pill px-2.5 py-1"
            style={{ background: cat.surface, color: cat.text }}
          >
            {cat.label}
          </span>
        </div>

        <h3 className="mt-4 font-display text-[1.6rem] leading-heading text-[var(--color-text-display)]">
          {pillar.title}
        </h3>
        <p className="mt-3 text-caption leading-body text-[var(--color-text-secondary)]">
          {pillar.description}
        </p>

        <span className="mt-5 inline-flex items-center gap-2 text-caption text-[var(--color-text-emphasis)]">
          Read more
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export function Pillars() {
  /* Three rows of two. Each ROW is the stacking unit, so the 2×2 grid is
     preserved and the rows gather into a deck as you scroll — which is how
     the Orenda reference actually behaves. */
  const rows = [
    ORG.pillars.slice(0, 2),
    ORG.pillars.slice(2, 4),
    ORG.pillars.slice(4, 6),
  ];

  return (
    <section className="section">
      <div className="wrap">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mono mb-4">What we do</p>
              <h2 className="display max-w-[14ch] text-[clamp(2.125rem,1.43rem+2.86vw,4rem)]">
                Six ways we work
              </h2>
            </div>
            <Link href="/what-we-do" className="group inline-flex items-center gap-2 text-body text-[var(--color-text-emphasis)]">
              View all
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-14">
          <StackCards>
            {rows.map((row, r) => (
              /* Opaque row ground: without it you see the row beneath through
                 the gutter between the two cards while they are stacked. */
              <div
                key={r}
                className="grid gap-6 rounded-xl bg-[var(--color-surface-page)] md:grid-cols-2"
              >
                {row.map((p, i) => (
                  <PillarCard key={p.slug} pillar={p} index={r * 2 + i} />
                ))}
              </div>
            ))}
          </StackCards>
        </div>
      </div>
    </section>
  );
}
