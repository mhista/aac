import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { ApplyPanel, HandbookDownload } from "@/components/ui/ApplyPanel";
import { Reveal } from "@/components/motion/Reveal";
import { Img } from "@/components/media/Img";
import { ORG } from "@/lib/org";

export const metadata = pageMetadata({
  title: "Become a Cancer Advocate",
  description:
    "Join 800+ AAC Cancer Advocates across Nigeria, Ghana and Kenya. Build a portfolio of documented impact while contributing to your community — certificates are earned through participation, not membership.",
  path: "/get-involved/advocates",
});

/* Who the model is for — the founder's list, grouped so it scans. */
const WHO = [
  { group: "Health", roles: ["Health professionals", "Health students", "Researchers"] },
  { group: "Education", roles: ["Students from any background", "Teachers and educators"] },
  { group: "Creative", roles: ["Designers", "Writers", "Photographers", "Video content creators"] },
  { group: "Digital", roles: ["Social media managers", "Data analysts", "Software developers"] },
];

const CYCLE = [
  {
    n: "01",
    title: "Online campaign",
    body: "Every activity starts with a campaign you run through your own social platforms and networks. With 700 advocates each reaching 100 people, that is 70,000 people. At 200 each, it is 140,000. That is the arithmetic of a movement.",
    detail: ["Participants", "Content shared", "Reach and impressions", "Engagement", "Shares and reposts", "Campaign duration"],
    detailLabel: "Documented as",
  },
  {
    n: "02",
    title: "Community project",
    body: "Then something physical and deliberately simple. Secondary schools first, then churches and mosques. A group of advocates visits a school, with permission, and delivers a cancer education session on prevention, HPV, cervical cancer, breast cancer or healthy lifestyles.",
    detail: ["Photographs", "Video", "Attendance records", "Pre- and post-assessments", "Project report"],
    detailLabel: "Documented as",
  },
  {
    n: "03",
    title: "It goes on the record",
    body: "Instead of “we went to a school”, the record reads: 10 advocates, 1 school, 300 students reached, cancer education delivered, assessment conducted, activity documented. Your work does not disappear when the project ends.",
    detail: ["Advocates involved", "Communities reached", "Students educated", "Online reach", "Projects completed"],
    detailLabel: "Tracked as",
  },
  {
    n: "04",
    title: "Recognition you earned",
    body: "Certificates are not given for joining a WhatsApp group. They are based on merit and participation, at different levels depending on what you actually did. Complete the full requirements and you receive the official Certificate as an AAC Cancer Advocate.",
    detail: [],
    detailLabel: "",
  },
];

const CV_BEFORE = [
  ["Education", "BSc. Biology"],
  ["Skills", "Communication · Teamwork"],
  ["Experience", "Limited community experience"],
];

const CV_AFTER = [
  ["Education", "BSc. Biology"],
  [
    "Community & leadership experience",
    "All Against Cancer Initiative — Cancer Advocate. Participated in awareness campaigns. Contributed to community cancer education projects. Reached 300+ students through a documented project. Participated in online campaigns reaching thousands. Planned and executed community activities with other advocates.",
  ],
  ["Evidence", "Project reports · Photos · Video · Attendance records · Assessment results · AAC certificates · Documented impact"],
];

export default function AdvocatesPage() {
  return (
    <>
      <PageHero
        eyebrow="Get involved · Advocates"
        title="Become a Cancer Advocate."
        lede="We do not want people who join an organisation and collect a certificate. We want people who take what they learn and bring it to someone else — and who leave with proof of what they did."
      />

      {/* ── The model: two things at once ─────────────────────────────── */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <p className="mono mb-4">Our model</p>
            <h2 className="display max-w-[20ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">
              Two things at the same time.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
            <Reveal>
              <div className="h-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-7 md:p-9">
                <span className="mono">01 · For you</span>
                <h3 className="mt-4 font-display text-[1.6rem] leading-heading text-[var(--color-text-display)]">
                  Building your portfolio
                </h3>
                <p className="mt-3 text-body leading-body text-[var(--color-text-secondary)]">
                  Experience that helps you stand out when you apply for jobs, scholarships,
                  fellowships, internships, graduate programmes, research opportunities and
                  leadership programmes.
                </p>
                <p className="mt-4 text-body leading-body text-[var(--color-text-primary)]">
                  Instead of saying <em>&ldquo;I am a graduate&rdquo;</em> or{" "}
                  <em>&ldquo;I volunteered with an organisation&rdquo;</em>, you can show what you
                  actually did and the impact you contributed to.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="h-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-7 md:p-9">
                <span className="mono">02 · For your community</span>
                <h3 className="mt-4 font-display text-[1.6rem] leading-heading text-[var(--color-text-display)]">
                  Contributing where you live
                </h3>
                <p className="mt-3 text-body leading-body text-[var(--color-text-secondary)]">
                  At the same time, your participation has to create a real benefit for the people
                  around you. Reach, education, screening, support — measured, not assumed.
                </p>
                <p className="mt-4 font-display text-[1.35rem] leading-heading text-[var(--color-text-display)]">
                  This is why our model emphasises impact, not membership.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How the programme works ───────────────────────────────────── */}
      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap">
          <Reveal>
            <p className="mono mb-4">How it works</p>
            <h2 className="display max-w-[18ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">
              We keep it simple.
            </h2>
            <p className="measure mt-5 text-body-l leading-lede text-[var(--color-text-secondary)]">
              An online campaign, then a straightforward community project — documented properly
              at every step, so it counts for you and for the record.
            </p>
          </Reveal>

          <ol className="mt-14 space-y-6">
            {CYCLE.map((c, i) => (
              <Reveal key={c.n} delay={i * 0.06}>
                <li className="grid gap-6 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-7 md:grid-cols-[auto_1fr_auto] md:gap-10 md:p-9">
                  <span className="mono">{c.n}</span>
                  <div>
                    <h3 className="font-display text-[1.5rem] leading-heading text-[var(--color-text-display)]">
                      {c.title}
                    </h3>
                    <p className="mt-3 max-w-[58ch] text-body leading-body text-[var(--color-text-secondary)]">
                      {c.body}
                    </p>
                  </div>
                  {c.detail.length > 0 && (
                    <div className="md:w-[220px]">
                      <p className="mono mb-3">{c.detailLabel}</p>
                      <ul className="space-y-1.5">
                        {c.detail.map((d) => (
                          <li key={d} className="text-caption text-[var(--color-text-secondary)]">{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Portfolio: before and after ───────────────────────────────── */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <p className="mono mb-4">What changes</p>
            <h2 className="display max-w-[20ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">
              Your CV, before and after.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-xl border border-[var(--color-border-default)] p-7">
                <p className="mono mb-5">Before</p>
                <dl className="divide-y divide-[var(--color-border-default)]">
                  {CV_BEFORE.map(([k, v]) => (
                    <div key={k} className="py-4">
                      <dt className="text-caption font-medium text-[var(--color-text-primary)]">{k}</dt>
                      <dd className="mt-1 text-caption leading-body text-[var(--color-text-secondary)]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="h-full rounded-xl border-2 border-[var(--color-border-brand)] bg-[var(--color-surface-sunken)] p-7">
                <p className="mono mb-5 !text-[var(--color-text-emphasis)]">After</p>
                <dl className="divide-y divide-[var(--color-border-default)]">
                  {CV_AFTER.map(([k, v]) => (
                    <div key={k} className="py-4">
                      <dt className="text-caption font-medium text-[var(--color-text-primary)]">{k}</dt>
                      <dd className="mt-1 text-caption leading-body text-[var(--color-text-secondary)]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <p className="measure mt-10 font-display text-[clamp(1.4rem,1.15rem+1.1vw,2rem)] leading-heading text-[var(--color-text-display)]">
              You are no longer saying &ldquo;I volunteered.&rdquo; You can show this is what I did,
              this is the role I played, this is who we reached, and this is the evidence.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Who can participate ───────────────────────────────────────── */}
      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Reveal>
            <p className="mono mb-4">Who can join</p>
            <h2 className="display max-w-[16ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">
              There is a place for you.
            </h2>
            <p className="measure mt-5 text-body leading-body text-[var(--color-text-secondary)]">
              Cancer is a problem that needs different people with different skills. We work across
              four departments and several units, so there is room whatever you do.
            </p>

            <dl className="mt-9 grid gap-6 sm:grid-cols-2">
              {WHO.map((w) => (
                <div key={w.group} className="border-t border-[var(--color-border-default)] pt-4">
                  <dt className="mono mb-2">{w.group}</dt>
                  <dd>
                    <ul className="space-y-1">
                      {w.roles.map((r) => (
                        <li key={r} className="text-caption text-[var(--color-text-secondary)]">{r}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.1}>
            <Img src="youth-students-walking" ratio="4/3" sizes="(max-width:1024px) 100vw, 45vw" className="rounded-xl" />
          </Reveal>
        </div>
      </section>

      {/* ── Doors it opens ────────────────────────────────────────────── */}
      <section className="section">
        <div className="wrap mx-auto max-w-[68ch] text-center">
          <Reveal>
            <p className="mono mb-4">Afterwards</p>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">
              &ldquo;Tell us about your leadership or community impact.&rdquo;
            </h2>
            <p className="mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">
              When a scholarship, fellowship, job or leadership application asks you that, you will
              have real experiences to draw on — leadership, teamwork, communication, community
              engagement, project implementation, problem-solving and measurable impact.
            </p>
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {["Leadership","Teamwork","Communication","Community engagement","Project implementation","Problem-solving","Measurable impact"].map((t) => (
                <li key={t} className="rounded-pill border border-[var(--color-border-default)] px-4 py-2 text-caption text-[var(--color-text-secondary)]">{t}</li>
              ))}
            </ul>
            <p className="mt-10 font-display text-[clamp(1.4rem,1.15rem+1.1vw,1.9rem)] leading-heading text-[var(--color-text-display)]">
              Learn something, contribute something, and leave with something.
            </p>
            <p className="mt-4 text-body text-[var(--color-text-secondary)]">
              You should be able to look back and say: I did not just join {ORG.shortName}. I actually
              contributed to something.
            </p>
          </Reveal>
        </div>
      </section>

      <ApplyPanel
        title="Ready to start?"
        body="Applications are reviewed after you fill in the application form. Tell us your name, country, what you do, and one sentence on why you want to be an advocate. Everything else — how projects work, how participation is documented, how the certificates are earned — is covered at orientation."
        subject="Cancer Advocate application"
        interest="advocate"
        applyHref="/join"
      />

      <HandbookDownload />
    </>
  );
}
