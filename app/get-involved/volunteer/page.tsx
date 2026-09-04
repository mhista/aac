import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { ApplyPanel } from "@/components/ui/ApplyPanel";
import { Reveal } from "@/components/motion/Reveal";

export const metadata = pageMetadata({
  title: 'Volunteer',
  description: 'Give your skills to All Against Cancer — design, writing, translation, data, software, photography, events and research support.',
  path: '/get-involved/volunteer',
});

const NEEDS = [
  { area: "Design & illustration", detail: "Campaign graphics, printed materials, infographics that make prevention information easy to understand." },
  { area: "Writing & editing", detail: "Plain-language health writing, event write-ups, grant applications." },
  { area: "Translation", detail: "Hausa, Yoruba, Igbo, Twi, Swahili and Pidgin. Prevention information only works in a language people think in." },
  { area: "Software & data", detail: "Our dashboard, impact measurement, and the tools chapters use to report what they do." },
  { area: "Photography & video", detail: "Documenting events properly, with consent, so our work can be seen." },
  { area: "Events & logistics", detail: "Screening drives and campus outreach need people who can organise." },
  { area: "Research support", detail: "Literature reviews, data collection, analysis." },
  { area: "Social media", detail: "Turning evidence into things people actually read and share." },
];

export default function VolunteerPage() {
  return (
    <>
      <PageHero
        eyebrow="Get involved · Volunteer"
        title="Give what you are good at."
        lede="A cancer movement is not only doctors. It runs on designers, writers, translators, developers, photographers and organisers. If you have a skill, we probably need it."
      />
      <section className="section">
        <div className="wrap">
          <ul className="grid gap-6 md:grid-cols-2">
            {NEEDS.map((n, i) => (
              <Reveal key={n.area} delay={(i % 2) * 0.06}>
                <li className="border-t border-[var(--color-border-default)] pt-5">
                  <h2 className="font-display text-[1.4rem] leading-heading text-[var(--color-text-display)]">{n.area}</h2>
                  <p className="mt-2 text-caption leading-body text-[var(--color-text-secondary)]">{n.detail}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <ApplyPanel
        title="Offer your skills"
        body="Tell us what you do, roughly how much time you have, and where you are. We will only come back to you when there is something real that fits — we will not put you on a list and forget about you."
        subject="Volunteering with AAC"
        interest="volunteer"
      />
    </>
  );
}
