import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ORG } from "@/lib/org";
import { getPublicSettings } from "@/lib/cms/public-settings";
import { ContactForm } from "@/components/ui/ContactForm";

export const metadata = pageMetadata({
  title: 'Contact',
  description: 'Get in touch with All Against Cancer — general enquiries, partnerships, media, and patient and survivor support.',
  path: '/contact',
});

const routes = (general: string, support: string) => [
  { title: "General enquiries", body: "Questions about our work, chapters, volunteering or anything else.", email: general },
  { title: "Patient & survivor support", body: "If you or someone you love is facing cancer and needs help finding support.", email: support },
  { title: "Partnerships", body: "Hospitals, pharmacies, universities, research bodies, companies and funders.", email: general },
  { title: "Media", body: "Interviews, press enquiries and requests for our logo or materials.", email: general },
];

export default async function ContactPage() {
  const S = await getPublicSettings();
  const ROUTES = routes(S.email.general, S.email.support);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to us."
        lede="We read everything that comes in. Please allow two to five working days for a reply — we are a small team and we would rather answer properly than quickly."
      />

      <section className="section">
        <div className="wrap grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <div>
            <Reveal>
              <ContactForm />
            </Reveal>

            {/* The addresses stay. Some people would rather write from their
                own mail client, and removing that would be a downgrade. */}
            <p className="mono mb-3 mt-12">Or email the right person directly</p>
            <ul className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
              {ROUTES.map((r, i) => (
                <Reveal key={r.title} delay={i * 0.06}>
                  <li className="py-7">
                    <h2 className="font-display text-[1.5rem] text-[var(--color-text-display)]">{r.title}</h2>
                    <p className="mt-2 max-w-[52ch] text-caption leading-body text-[var(--color-text-secondary)]">{r.body}</p>
                    <a href={`mailto:${r.email}`} className="mt-3 inline-block text-body text-[var(--color-text-emphasis)] underline-offset-4 hover:underline">
                      {r.email}
                    </a>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal delay={0.1}>
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] p-7">
              <p className="mono mb-4">Registered organisation</p>
              <p className="text-body leading-body text-[var(--color-text-primary)]">
                {ORG.name}
                <br />
                {ORG.registration.body}
                <br />
                RN {ORG.registration.number}
                <br />
                {ORG.registration.country}
              </p>

              <p className="mono mb-3 mt-8">Where we work</p>
              <p className="text-body text-[var(--color-text-primary)]">{ORG.countries.join(" · ")}</p>

              <p className="mono mb-3 mt-8">Follow</p>
              <ul className="flex flex-wrap gap-1">
                {ORG.social.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${ORG.abbr} on ${s.name}`}
                       className="grid h-11 w-11 place-items-center rounded-pill text-[var(--color-text-secondary)] transition-colors duration-hover hover:bg-[var(--color-action-ghost-hover-surface)] hover:text-[var(--color-text-primary)]">
                      <SocialIcon name={s.name} className="h-[18px] w-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
