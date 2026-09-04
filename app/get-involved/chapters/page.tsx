import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Steps } from "@/components/ui/Steps";
import { ApplyPanel } from "@/components/ui/ApplyPanel";
import { Empty } from "@/components/ui/Empty";
import { Reveal } from "@/components/motion/Reveal";
import { getChapters } from "@/lib/cms";
import { ORG } from "@/lib/org";

export const metadata = pageMetadata({
  title: 'University Chapters',
  description: 'AAC campus chapters run awareness, screening and education work at universities across Nigeria, Ghana and Kenya.',
  path: '/get-involved/chapters',
});

export const revalidate = 3600;

export default async function ChaptersPage() {
  const chapters = await getChapters();

  return (
    <>
      <PageHero
        eyebrow="Get involved · Chapters"
        title="Chapters on campus."
        lede="Universities are full of people who can educate their peers, run screening drives, challenge misinformation and build things. A chapter is how that gets organised."
        aside={chapters.length > 0 ? <p className="mono">{chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}</p> : null}
      />

      {/* Reach map */}
      <section className="section">
        <div className="wrap grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">Where we are</h2>
            <ul className="mt-8 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
              {ORG.countries.map((c) => {
                const n = chapters.filter((ch) => ch.country === c).length;
                return (
                  <li key={c} className="flex items-baseline justify-between gap-6 py-4">
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--color-action-primary)]" />
                      <span className="font-display text-[1.5rem] text-[var(--color-text-display)]">{c}</span>
                    </span>
                    <span className="mono">{n > 0 ? `${n} chapter${n === 1 ? "" : "s"}` : "Active"}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mono mt-6">{ORG.structure.find((s) => s.label === "Campus Coordinators")?.value} campus coordinators</p>
          </Reveal>
          <Reveal delay={0.1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aac-africa.svg" alt="Map of Africa with Nigeria, Ghana and Kenya highlighted as countries where AAC is active." className="w-full" />
          </Reveal>
        </div>
      </section>

      {/* Directory */}
      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap">
          <Reveal><h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">Chapter directory</h2></Reveal>
          <div className="mt-10">
            {chapters.length === 0 ? (
              <Reveal>
                <Empty
                  title="The directory is being compiled"
                  body="Chapters are active on campuses across three countries. Each one is listed here — university, city, coordinator and recent events — once its details have been confirmed by a regional coordinator."
                  cta={{ label: "Start a chapter", href: "#apply" }}
                  compact
                />
              </Reveal>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {chapters.map((c, i) => (
                  <Reveal key={c.id} delay={(i % 3) * 0.06}>
                    <li className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-5">
                      <h3 className="font-display text-[1.3rem] text-[var(--color-text-display)]">{c.university}</h3>
                      <p className="mono mt-2">{[c.city, c.country].filter(Boolean).join(" · ")}</p>
                      {c.member_count ? <p className="mt-2 text-caption text-[var(--color-text-secondary)]">{c.member_count} members</p> : null}
                    </li>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Steps
        heading="Starting a chapter"
        steps={[
          { title: "Get in touch", body: "Tell us your university, your course and how many people you can bring with you to start." },
          { title: "Meet a coordinator", body: "A regional coordinator walks you through what a chapter commits to." },
          { title: "Form the core", body: "You need a small founding team — not a crowd. Three or four committed people is enough." },
          { title: "Training", body: "Your core team goes through advocate orientation together." },
          { title: "Launch", body: "Your first activity on campus, with materials and support." },
          { title: "Report", body: "Chapters publish what they run through the AAC dashboard, so it counts toward our impact." },
        ]}
      />

      <div id="apply" className="scroll-mt-28">
        <ApplyPanel
          title="Start a chapter"
          body="Tell us your university, your country and who else is with you. Chapters are approved by the regional coordinator for your area."
          subject="Start an AAC chapter"
        />
      </div>
    </>
  );
}
