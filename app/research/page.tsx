import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Empty } from "@/components/ui/Empty";
import { ApplyPanel } from "@/components/ui/ApplyPanel";
import { Reveal } from "@/components/motion/Reveal";
import { Img } from "@/components/media/Img";

export const metadata: Metadata = {
  title: "Research",
  description: "AAC supports cancer research that answers questions relevant to African communities — prevention, early detection, access to treatment, health systems and epidemiology.",
};

const PRIORITIES = [
  "Cancer prevention", "Early detection", "Access to treatment", "Cancer medicines",
  "Health systems", "Patient experiences", "Cancer epidemiology", "Digital health",
  "Artificial intelligence", "African-specific cancer challenges",
];

export default function ResearchPage() {
  return (
    <>
      <PageHero
        eyebrow="Research"
        title="African questions need African evidence."
        lede="Africa cannot depend entirely on solutions developed for other populations and other health systems. We support research that answers questions relevant to the communities we work in."
      />

      <section className="section">
        <div className="wrap grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">Where we focus</h2>
            <ul className="mt-7 flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <li key={p} className="rounded-pill border border-[var(--color-border-default)] px-4 py-2 text-caption text-[var(--color-text-secondary)]">{p}</li>
              ))}
            </ul>
            <p className="measure mt-8 text-body leading-body text-[var(--color-text-secondary)]">
              We want young Africans to see cancer research not as something reserved for laboratories and
              professors, but as a field where they can contribute to solving problems affecting their own
              communities.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Img src="research-laboratory" ratio="4/3" sizes="(max-width:768px) 100vw, 50vw" className="rounded-xl" />
          </Reveal>
        </div>
      </section>

      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap">
          <Reveal>
            <h2 className="display mb-8 text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">Publications</h2>
            <Empty
              title="Our first publications are in progress"
              body="Papers, reports and evidence reviews produced or supported by AAC will be listed here with authors, journal, year and a DOI, so anyone can check them. We publish citations, not claims."
              compact
            />
          </Reveal>
        </div>
      </section>

      <ApplyPanel
        title="Collaborate on research"
        body="If you are a researcher, a student with a question worth answering, or an institution looking for a partner in Nigeria, Ghana or Kenya — tell us what you are working on."
        subject="Research collaboration"
        mailtoOnly
      />
    </>
  );
}
