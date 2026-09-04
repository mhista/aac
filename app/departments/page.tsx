import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight } from "@/components/ui/Icon";
import { pageMetadata } from "@/lib/seo";
import { ORG } from "@/lib/org";

export const metadata = pageMetadata({
  title: "Departments",
  description:
    "The four departments of All Against Cancer Initiative: Awareness, Advocacy & Campaign; Patient & Survivor Support; Medication Access & Global Partnership; and Research, Education & Innovation.",
  path: "/departments",
});

const CATEGORY: Record<string, { label: string; surface: string; text: string }> = {
  awareness:  { label: "Awareness",  surface: "var(--color-category-awareness-surface)",  text: "var(--color-category-awareness-text)" },
  support:    { label: "Support",    surface: "var(--color-category-support-surface)",    text: "var(--color-category-support-text)" },
  research:   { label: "Research",   surface: "var(--color-category-research-surface)",   text: "var(--color-category-research-text)" },
  innovation: { label: "Innovation", surface: "var(--color-category-innovation-surface)", text: "var(--color-category-innovation-text)" },
};

export default function DepartmentsPage() {
  return (
    <>
      <PageHero
        eyebrow="How we are organised"
        title="Explore our departments."
        lede="Four departments, each led by a director. Open one to meet the person leading it and see what they are actually working on."
        aside={<p className="mono">{ORG.departments.length} departments</p>}
      />

      <section className="section">
        <div className="wrap grid gap-6 md:grid-cols-2">
          {ORG.departments.map((d, i) => {
            const cat = CATEGORY[d.category];
            return (
              <Reveal key={d.slug} delay={(i % 2) * 0.08}>
                <Link
                  href={`/departments/${d.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-soft transition-shadow duration-hover ease-entrance hover:shadow-lift"
                >
                  <div className="overflow-hidden">
                    <Img src={d.image} ratio="3/2" sizes="(max-width:768px) 100vw, 50vw"
                         imgClassName="transition-transform duration-[600ms] ease-entrance group-hover:scale-[1.03]" />
                  </div>
                  <div className="flex flex-1 flex-col p-6 md:p-7">
                    <div className="flex items-center gap-3">
                      <span className="mono !text-[var(--color-text-secondary)]">{d.number}</span>
                      <span className="mono inline-block rounded-pill px-2.5 py-1"
                            style={{ background: cat.surface, color: cat.text }}>
                        {cat.label}
                      </span>
                    </div>
                    <h2 className="mt-4 font-display text-[1.5rem] leading-heading text-[var(--color-text-display)]">
                      {d.name}
                    </h2>
                    <p className="mt-3 flex-1 text-caption leading-body text-[var(--color-text-secondary)]">
                      {d.summary}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-caption text-[var(--color-text-emphasis)]">
                      Explore department
                      <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
