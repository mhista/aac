import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Avatar } from "@/components/media/Avatar";
import { ArrowRight } from "@/components/ui/Icon";
import type { TeamMember } from "@/lib/cms";

/**
 * Leadership, on the homepage.
 *
 * People kept asking who runs this and not finding out: the answer was on the
 * About page, two clicks from the front door. For a young health charity asking
 * strangers for trust — and for their diagnosis — "who are you" is not a
 * secondary question, so it belongs where people are already scrolling.
 *
 * Deliberately a preview rather than the whole board. Eight faces establish
 * that real, named people are behind this; the remaining ones would turn the
 * homepage into a directory. The link carries the rest.
 *
 * Returns null when nobody is published — the same rule as every other section.
 * An empty grid under a "Leadership" heading is worse than no heading.
 */

const SHOWN = 8;

export function Leadership({
  team,
  eyebrow = "Leadership",
  heading = "The people behind AAC",
  href = "/about",
}: {
  team: TeamMember[];
  eyebrow?: string;
  heading?: string;
  href?: string;
}) {
  if (team.length === 0) return null;

  /* Board and directors first: the founder, the co-founder and the department
     directors are who a visitor means by "leadership". Coordinators are the
     network, and they are listed on their own pages. */
  const rank = (t: string | null) => (t === "board" ? 0 : t === "director" ? 1 : 2);
  const people = [...team].sort((a, b) => rank(a.tier) - rank(b.tier)).slice(0, SHOWN);
  const more = team.length - people.length;

  return (
    <section className="section bg-[var(--color-surface-page-alt)]">
      <div className="wrap">
        <Reveal>
          <p className="mono mb-4">{eyebrow}</p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display max-w-[18ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">
              {heading}
            </h2>
            <Link
              href={href}
              className="group mono inline-flex min-h-[44px] items-center gap-2 hover:text-[var(--color-text-primary)]"
            >
              {more > 0 ? `And ${more} more` : "More about us"}
              <ArrowRight className="h-[1.05em] w-[1.05em] transition-transform duration-hover ease-entrance group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <ul className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {people.map((m, i) => (
            <Reveal key={m.id} delay={(i % 4) * 0.07}>
              <li>
                <Avatar name={m.full_name} photo={m.photo} className="rounded-lg" sizes="280px" />
                <h3 className="mt-4 font-display text-[1.15rem] leading-heading text-[var(--color-text-display)]">
                  {m.full_name}
                </h3>
                {m.role_title && (
                  <p className="mono mt-1.5 leading-relaxed">{m.role_title}</p>
                )}
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
