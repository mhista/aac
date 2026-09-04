import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { Empty } from "@/components/ui/Empty";
import { Values } from "@/components/sections/Values";
import { CtaBand } from "@/components/sections/CtaBand";
import { getTeam } from "@/lib/cms";
import { ORG } from "@/lib/org";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "About",
  description: ORG.mission,
};

export default async function AboutPage() {
  const team = await getTeam();

  return (
    <>
      <PageHero eyebrow="About" title="Who we are." lede={ORG.visionShort} />

      <section className="section">
        <div className="wrap grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">Our mission</h2>
            <p className="measure mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">{ORG.mission}</p>
            <p className="measure mt-6 font-display text-[1.5rem] leading-heading text-[var(--color-text-display)]">
              {ORG.principle}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Img src="education-girls-studying" ratio="4/3" sizes="(max-width:1024px) 100vw, 50vw" className="rounded-xl" />
          </Reveal>
        </div>
      </section>

      {/* Structure — real figures */}
      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap">
          <Reveal>
            <p className="mono mb-4">How we are organised</p>
            <h2 className="display max-w-[16ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">
              A structure built to outlast any one person
            </h2>
          </Reveal>
          <dl className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {ORG.structure.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="border-t border-[var(--color-border-default)] pt-5">
                  <dt className="font-display text-[2.5rem] leading-none text-[var(--color-text-display)]">{s.value}</dt>
                  <dd className="mt-2 text-caption text-[var(--color-text-secondary)]">{s.label}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <Values />

      {/* Leadership — empty until the CMS has real people */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <p className="mono mb-4">Leadership</p>
            <h2 className="display max-w-[16ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">The people behind AAC</h2>
          </Reveal>
          <div className="mt-12">
            {team.length === 0 ? (
              <Reveal>
                <Empty
                  title="Our board and directors are being photographed"
                  body="AAC is led by a board of seven, four department directors, and coordinators across three countries. Their names, roles and photographs will appear here — real people, properly credited, not placeholder faces."
                  compact
                />
              </Reveal>
            ) : (
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {team.map((m, i) => (
                  <Reveal key={m.id} delay={(i % 4) * 0.07}>
                    <li>
                      {m.photo?.url && <Img src={m.photo.url} alt={m.photo.alt} ratio="1/1" sizes="280px" className="rounded-lg" />}
                      <h3 className="mt-4 font-display text-[1.35rem] text-[var(--color-text-display)]">{m.full_name}</h3>
                      {m.role_title && <p className="mono mt-1">{m.role_title}</p>}
                    </li>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
