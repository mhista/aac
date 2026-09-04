import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { ORG } from "@/lib/org";

export const metadata: Metadata = {
  title: "Get Involved",
  description: "Become a cancer advocate, join the AAC Fellowship, start a campus chapter, volunteer, or partner with All Against Cancer.",
};

const ROUTES = [
  { href: "/get-involved/advocates", title: "Become an Advocate", body: "The main way in. Learn what you need to know about cancer, then take it to the people around you.", who: "Anyone, anywhere" },
  { href: "/get-involved/fellowship", title: "AAC Fellowship", body: "A leadership and capacity-building programme for young Africans who want to lead projects, not just join them.", who: "Students & early-career" },
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
                    </span>
                    <span aria-hidden="true" className="hidden text-2xl text-[var(--color-text-emphasis)] transition-transform duration-hover ease-entrance group-hover:translate-x-2 md:block">→</span>
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
