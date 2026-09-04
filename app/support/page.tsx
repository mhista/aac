import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { ORG, MEDICAL_NOTICE } from "@/lib/org";

export const metadata = pageMetadata({
  title: 'Patient & Survivor Support',
  description: 'If you or someone you love is facing cancer, this page explains what All Against Cancer can and cannot do, and how to reach our support team.',
  path: '/support',
});

/**
 * The Support page.
 *
 * This is read by frightened people, so it is the calmest page on the site:
 * no photography, larger type, short lines, and the medical boundary stated
 * plainly near the top rather than buried at the bottom as a disclaimer.
 */
export default function SupportPage() {
  return (
    <>
      <PageHero
        eyebrow="Support"
        title="You should not face cancer alone."
        lede="Cancer affects more than the person diagnosed. It affects families, caregivers, communities and livelihoods. If you are looking for help, here is what we can do."
      />

      {/* Medical boundary — stated early, not hidden */}
      <section className="pt-14">
        <div className="wrap">
          <Reveal>
            <div className="mx-auto max-w-[68ch] rounded-xl border-2 border-[var(--color-border-brand)] bg-[var(--color-surface-sunken)] p-7 md:p-8">
              <p className="mono mb-3">Please read this first</p>
              <p className="text-body-l leading-lede text-[var(--color-text-primary)]">{MEDICAL_NOTICE}</p>
              <p className="mt-4 text-body leading-body text-[var(--color-text-secondary)]">
                If you have symptoms that worry you, please see a doctor or go to your nearest health
                facility. Do not wait for us to reply before seeking care.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap mx-auto max-w-[68ch]">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">What we can help with</h2>
            <ul className="mt-6 space-y-4 text-body-l leading-lede text-[var(--color-text-primary)]">
              <li>Connecting you to information you can trust, in plain language.</li>
              <li>Pointing you towards support systems, services and organisations that may be able to help.</li>
              <li>Working with partners on access to cancer medicines and services where we can.</li>
              <li>Putting you in touch with survivors and advocates who have been where you are.</li>
            </ul>

            <h2 className="display mt-14 text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">What we cannot do</h2>
            <ul className="mt-6 space-y-4 text-body-l leading-lede text-[var(--color-text-primary)]">
              <li>We cannot diagnose you, interpret your results, or tell you what your scan means.</li>
              <li>We cannot recommend or change treatment. Only your medical team can do that.</li>
              <li>We cannot tell you your prognosis.</li>
              <li>We are not an emergency service.</li>
            </ul>
            <p className="mt-6 text-body leading-body text-[var(--color-text-secondary)]">
              We say this plainly because a vague answer from us could cost someone time they do not have.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap mx-auto max-w-[68ch] text-center">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">Reach the support team</h2>
            <p className="mt-5 text-body-l leading-lede text-[var(--color-text-secondary)]">
              Write to us and tell us as much or as little as you want to. A person will read it.
            </p>
            <div className="mt-8">
              <Button href={`mailto:${ORG.email.support}`} size="lg" arrow>{ORG.email.support}</Button>
            </div>
            <p className="mono mt-6">We aim to reply within two to five working days</p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal>
            <h2 className="display mb-8 text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">Support directory</h2>
            <Empty
              title="We are building a verified directory"
              body="Treatment centres, financial aid routes, counselling services, medication access schemes and survivor groups across Nigeria, Ghana and Kenya. Every entry has to be checked before it goes up — sending someone to a service that has closed or cannot help them would do real harm. Until then, please write to us directly and we will help you personally."
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
