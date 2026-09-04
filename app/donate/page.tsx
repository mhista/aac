import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { ORG } from "@/lib/org";

export const metadata = pageMetadata({
  title: 'Donate',
  description: 'Support cancer awareness, patient support, research and access to care across Africa. Registered with the Corporate Affairs Commission, Nigeria.',
  path: '/donate',
});

/**
 * Donate.
 *
 * Online giving is not live yet, and this page says so rather than showing a
 * dead form or invented bank details. An NGO that takes money must be exact
 * about how, so the honest state is the only acceptable one until payments
 * are configured and verified.
 */
export default function DonatePage() {
  return (
    <>
      <PageHero
        eyebrow="Donate"
        title="Give to the work."
        lede="Money moves this movement from good intentions to screenings, materials, training and medicines. We will account for every naira of it."
      />

      <section className="section">
        <div className="wrap grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">Where your money goes</h2>
            <ul className="mt-8 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
              {[
                ["Awareness & education", "Printed materials, campus outreach, community sessions."],
                ["Screening & early detection", "Getting screening to people who would otherwise not be reached."],
                ["Patient & survivor support", "Direct support for people navigating a diagnosis."],
                ["Medication access", "Working with partners to make cancer medicines reachable."],
                ["Training", "Equipping advocates, fellows and campus coordinators."],
              ].map(([t, b]) => (
                <li key={t} className="py-5">
                  <h3 className="font-display text-[1.35rem] text-[var(--color-text-display)]">{t}</h3>
                  <p className="mt-1.5 text-caption leading-body text-[var(--color-text-secondary)]">{b}</p>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-xl border-2 border-[var(--color-border-brand)] bg-[var(--color-surface-sunken)] p-8">
              <p className="mono mb-3">Online giving</p>
              <h2 className="display text-[1.75rem]">Not live yet.</h2>
              <p className="mt-4 text-body leading-body text-[var(--color-text-secondary)]">
                We are setting up donations properly — a payment provider, receipts, and reporting we can
                stand behind. We would rather do that carefully than put up a payment form and hope.
              </p>
              <p className="mt-4 text-body leading-body text-[var(--color-text-secondary)]">
                If you want to give now, write to us and we will send you our verified account details
                directly and confirm receipt personally.
              </p>
              <div className="mt-7">
                <Button href={`mailto:${ORG.email.general}?subject=${encodeURIComponent("I would like to donate")}`} size="lg" arrow>
                  Get in touch to give
                </Button>
              </div>
              <p className="mono mt-6">
                {ORG.registration.body} · RN {ORG.registration.number}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap mx-auto max-w-[62ch] text-center">
          <Reveal>
            <h2 className="display text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)]">Other ways to help</h2>
            <p className="mt-5 text-body-l leading-lede text-[var(--color-text-secondary)]">
              If you cannot give money, you can give time, skill or reach — and for us those are worth
              just as much.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href="/get-involved/volunteer" variant="secondary" size="lg">Volunteer a skill</Button>
              <Button href="/get-involved/partner" variant="secondary" size="lg">Partner with us</Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
