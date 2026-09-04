import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Img } from "@/components/media/Img";
import { Empty } from "@/components/ui/Empty";
import { Reveal } from "@/components/motion/Reveal";
import { getProgrammes } from "@/lib/cms";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Programmes",
  description: "Awareness campaigns, screening drives, patient support, research and innovation programmes run by All Against Cancer.",
};

export default async function ProgrammesPage() {
  const programmes = await getProgrammes();
  return (
    <>
      <PageHero
        eyebrow="Programmes"
        title="What we are running."
        lede="Each programme has a purpose, a place and a way of measuring whether it worked. They appear here once they are live — not while they are still an idea."
        aside={programmes.length > 0 ? <p className="mono">{programmes.length} active</p> : null}
      />
      <section className="section">
        <div className="wrap">
          {programmes.length === 0 ? (
            <Reveal>
              <Empty
                title="Programmes are being set up"
                body="Our six areas of work are described on the What We Do page. Individual programmes — with their locations, partners and targets — are published here as each one launches."
                cta={{ label: "See what we do", href: "/what-we-do" }}
              />
            </Reveal>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {programmes.map((p, i) => (
                <Reveal key={p.id} delay={(i % 2) * 0.08}>
                  <Link href={`/programmes/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] transition-shadow duration-hover ease-entrance hover:shadow-lift">
                    {p.cover?.url && (
                      <Img src={p.cover.url} alt={p.cover.alt} ratio="3/2" sizes="(max-width:768px) 100vw, 50vw"
                           imgClassName="transition-transform duration-[600ms] ease-entrance group-hover:scale-[1.03]" />
                    )}
                    <div className="flex flex-1 flex-col p-6 md:p-7">
                      {p.status_label && <p className="mono">{p.status_label}</p>}
                      <h2 className="mt-3 font-display text-[1.6rem] leading-heading text-[var(--color-text-display)]">{p.title}</h2>
                      {p.excerpt && <p className="mt-3 text-caption leading-body text-[var(--color-text-secondary)]">{p.excerpt}</p>}
                      {p.locations && p.locations.length > 0 && <p className="mono mt-4">{p.locations.join(" · ")}</p>}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
