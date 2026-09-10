import { getCampus } from "@/lib/site/campus";
import { SITE } from "@/lib/seo";
import { ORG } from "@/lib/org";

/**
 * The ribbon that says which chapter's site you are on.
 *
 * A campus site is the same pages, the same colours and the same logo as
 * aaci.ngo — which is the point, and also the risk. Somebody who lands on
 * unn.aaci.ngo from a search result needs to know within a second that they are
 * on the University of Nigeria chapter's site and not on the national one, or
 * they will read "our events" as AAC's events and conclude the organisation is
 * smaller than it is.
 *
 * So: one line, always, above everything, naming the chapter and offering the
 * way back. It renders nothing at all on the main site.
 */
export async function CampusBar() {
  const campus = await getCampus();
  if (!campus) return null;

  const where = [campus.city, campus.country].filter(Boolean).join(", ");

  return (
    <div
      className="relative z-[60] w-full"
      style={{ background: "var(--color-violet-900)", color: "var(--color-text-on-inverse, #fff)" }}
    >
      <div className="wrap flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <p className="mono" style={{ color: "inherit", opacity: 0.92 }}>
          {campus.name}
          {where && <span style={{ opacity: 0.65 }}> · {where}</span>}
        </p>
        <a
          href={SITE}
          className="mono inline-flex min-h-[32px] items-center gap-1.5 underline-offset-4 hover:underline"
          style={{ color: "inherit", opacity: 0.92 }}
        >
          {ORG.abbr} national site
          <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}
