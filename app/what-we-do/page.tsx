import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/sections/CtaBand";
import { ORG } from "@/lib/org";

export const metadata: Metadata = {
  title: "What We Do",
  description: "The six areas All Against Cancer works in: awareness and advocacy, patient and survivor support, medication access, research, education and innovation, and campus chapters.",
};

const CATEGORY: Record<string, { label: string; surface: string; text: string }> = {
  awareness:  { label: "Awareness",  surface: "var(--color-category-awareness-surface)",  text: "var(--color-category-awareness-text)" },
  support:    { label: "Support",    surface: "var(--color-category-support-surface)",    text: "var(--color-category-support-text)" },
  prevention: { label: "Prevention", surface: "var(--color-category-prevention-surface)", text: "var(--color-category-prevention-text)" },
  research:   { label: "Research",   surface: "var(--color-category-research-surface)",   text: "var(--color-category-research-text)" },
  innovation: { label: "Innovation", surface: "var(--color-category-innovation-surface)", text: "var(--color-category-innovation-text)" },
};

export default function WhatWeDoPage() {
  return (
    <>
      <PageHero
        eyebrow="What we do"
        title="Six ways we work."
        lede={ORG.principle}
      />

      {ORG.pillars.map((p, i) => {
        const cat = CATEGORY[p.category];
        const flip = i % 2 === 1;
        return (
          <section key={p.slug} id={p.slug} className={`section scroll-mt-28 ${i % 2 ? "bg-[var(--color-surface-page-alt)]" : ""}`}>
            <div className="wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <Reveal className={flip ? "md:order-2" : ""}>
                <Img src={p.image} ratio="4/3" sizes="(max-width:768px) 100vw, 50vw" className="rounded-xl" />
              </Reveal>
              <Reveal delay={0.08} className={flip ? "md:order-1" : ""}>
                <div className="flex items-center gap-3">
                  <span className="mono !text-[var(--color-text-secondary)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mono inline-block rounded-pill px-2.5 py-1" style={{ background: cat.surface, color: cat.text }}>
                    {cat.label}
                  </span>
                </div>
                <h2 className="display mt-5 text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">{p.title}</h2>
                <p className="measure mt-5 text-body leading-body text-[var(--color-text-secondary)]">{p.description}</p>
              </Reveal>
            </div>
          </section>
        );
      })}

      <CtaBand />
    </>
  );
}
