import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { ApplyPanel } from "@/components/ui/ApplyPanel";
import { Empty } from "@/components/ui/Empty";
import { Reveal } from "@/components/motion/Reveal";
import { getPartners } from "@/lib/cms";

export const metadata = pageMetadata({
  title: 'Partner with us',
  description: 'AAC partners with hospitals, cancer centres, universities, pharmacies, pharmaceutical and biotechnology companies, government agencies, NGOs and funders.',
  path: '/get-involved/partner',
});

export const revalidate = 3600;

const KINDS = [
  { title: "Hospitals & cancer centres", body: "Screening partnerships, referral routes, and support for patients who reach you late." },
  { title: "Pharmacies, pharma & biotech", body: "The cost and availability of cancer medicines is one of the hardest problems we face. We want practical routes to access." },
  { title: "Universities & research institutions", body: "Chapters, joint research, and getting students into cancer work early." },
  { title: "Government & policy bodies", body: "Prevention only scales through policy. We bring evidence and reach." },
  { title: "NGOs & civil society", body: "We would rather collaborate than duplicate. If you already do it well, we want to work with you." },
  { title: "Technology companies", body: "Digital health, AI and computational tools that work where resources are limited." },
  { title: "Donors & philanthropists", body: "Funding that is accounted for, reported on, and tied to figures we can defend." },
];

export default async function PartnerPage() {
  const partners = await getPartners();
  return (
    <>
      <PageHero
        eyebrow="Get involved · Partner"
        title="Cancer is too big for one organisation."
        lede="We believe in collaboration rather than competition. The right partnership can turn a good idea into something that reaches thousands of people."
      />

      <section className="section">
        <div className="wrap">
          <ul className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
            {KINDS.map((k, i) => (
              <Reveal key={k.title} delay={i * 0.04}>
                <li className="grid gap-3 py-6 md:grid-cols-[1fr_1.4fr] md:gap-10">
                  <h2 className="font-display text-[1.4rem] leading-heading text-[var(--color-text-display)]">{k.title}</h2>
                  <p className="text-caption leading-body text-[var(--color-text-secondary)]">{k.body}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap">
          <Reveal><h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">Who we work with</h2></Reveal>
          <div className="mt-10">
            {partners.length === 0 ? (
              <Reveal>
                <Empty
                  title="Our partners are being confirmed"
                  body="We currently work with two healthcare and community partners. We list organisations here only with their agreement, so this page grows slowly and accurately rather than filling with logos we have no relationship with."
                  compact
                />
              </Reveal>
            ) : (
              <ul className="flex flex-wrap items-center gap-10">
                {partners.map((p) => (
                  <li key={p.id} className="text-body text-[var(--color-text-secondary)]">{p.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <ApplyPanel
        title="Start a conversation"
        body="Tell us who you are, what you do, and where you think we could work together. Partnership enquiries go to our partnerships department."
        subject="Partnership enquiry"
        mailtoOnly
      />
    </>
  );
}
