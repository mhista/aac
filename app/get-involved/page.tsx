import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { ORG } from "@/lib/org";
import { ArrowRight } from "@/components/ui/Icon";

export const metadata = pageMetadata({
  title: 'Get Involved',
  description: 'Become a cancer advocate, join the AAC Leadership Fellowship, start a campus chapter, volunteer your skills, or partner with All Against Cancer.',
  path: '/get-involved',
});

const ROUTES = [
  { href: "/get-involved/advocates", title: "Become an Advocate", body: "The main way in. Learn what you need to know about cancer, then take it to the people around you.", who: "Anyone, anywhere" },
  { href: "/get-involved/fellowship", title: "AAC Leadership Fellowship", body: "A leadership and capacity-building programme for young Africans who want to lead projects, not just join them.", who: "Students & early-career" },
  { href: "/get-involved/chapters", title: "University Chapters", body: "Start or join a chapter on your campus and run awareness, screening and education work where you study.", who: "Campus organisers" },
  { href: "/get-involved/volunteer", title: "Volunteer", body: "Design, writing, translation, data, events, photography, software — the movement runs on skills, not just goodwill.", who: "Skilled volunteers" },
  { href: "/get-involved/partner", title: "Partner with us", body: "Hospitals, pharmacies, universities, research bodies, companies and funders who can open doors we cannot.", who: "Organisations" },
];

export default function GetInvolvedPage() {
  return (
    <>
      <PageHero eyebrow="Get involved" title="There is a role for you." lede={ORG.principle} />
      <section className="section">
        <div className="wrap">
          <ul className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
            {ROUTES.map((r, i) => (
              <Reveal key={r.href} delay={i * 0.05}>
                <li>
                  <Link href={r.href} className="group grid items-baseline gap-4 py-8 md:grid-cols-[auto_1fr_auto] md:gap-10">
                    <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.25rem)] leading-heading text-[var(--color-text-display)]">
                        {r.title}
                      </span>
                      <span className="mt-2 block max-w-[56ch] text-caption leading-body text-[var(--color-text-secondary)]">{r.body}</span>
                      <span className="mono mt-3 block">{r.who}</span>
                      {/* Mobile has no hover, so the row needs a visible control
                          to read as tappable. Desktop keeps the arrow at the end. */}
                      <span className="mt-4 inline-flex items-center gap-2 rounded-pill border border-[var(--color-action-secondary-border)] px-4 py-2 text-caption font-medium text-[var(--color-action-secondary-text)] md:hidden">
                        Learn more
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </span>
                    <ArrowRight className="hidden h-6 w-6 text-[var(--color-text-emphasis)] transition-transform duration-hover ease-entrance group-hover:translate-x-2 md:block" />
                  </Link>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
