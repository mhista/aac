import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ImpactStats } from "@/components/sections/ImpactStats";
import { Reveal } from "@/components/motion/Reveal";
import { getImpactMetrics } from "@/lib/cms";
import { ORG } from "@/lib/org";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Impact",
  description: "The real numbers behind All Against Cancer — advocates, leaders, countries, students engaged, patients supported — and how we count them.",
};

export default async function ImpactPage() {
  const metrics = await getImpactMetrics();
  return (
    <>
      <PageHero
        eyebrow="Impact"
        title="What we can show you."
        lede="It is not enough to say we created awareness. These are the figures we can defend, dated, including the ones we are not proud of yet."
      />

      <ImpactStats metrics={metrics} />

      <section className="section">
        <div className="wrap grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">How we count</h2>
            <div className="measure mt-6 space-y-4 text-body leading-body text-[var(--color-text-secondary)]">
              <p>Advocates and leaders are counted as people who have completed orientation and are active in a chapter or region — not everyone who has ever joined a group.</p>
              <p>Students and health professionals engaged are counted from attendance at sessions we ran or co-ran.</p>
              <p>Patients supported is a small number and we report it exactly. Five people is five people. We will not write &ldquo;5+&rdquo; to make it look larger.</p>
              <p>Where we do not yet have a reliable way to measure something, we say so and report nothing rather than publishing an estimate.</p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">Our commitment</h2>
            <div className="measure mt-6 space-y-4 text-body leading-body text-[var(--color-text-secondary)]">
              <p>{ORG.values.find((v) => v.name === "Integrity")?.note}</p>
              <p>{ORG.values.find((v) => v.name === "Impact")?.note}</p>
              <p>We are building an evidence-based system so advocates can report what they did, coordinators can verify it, and the totals on this page come from records rather than recollection.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap">
          <Reveal>
            <p className="mono mb-4">Our community</p>
            <ul className="flex flex-wrap gap-2">
              {ORG.community.map((c) => (
                <li key={c} className="rounded-pill border border-[var(--color-border-default)] px-4 py-2 text-caption text-[var(--color-text-secondary)]">{c}</li>
              ))}
            </ul>
            <p className="mono mb-4 mt-10">Our focus</p>
            <ul className="flex flex-wrap gap-2">
              {ORG.focus.map((c) => (
                <li key={c} className="rounded-pill border border-[var(--color-border-default)] px-4 py-2 text-caption text-[var(--color-text-secondary)]">{c}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}
