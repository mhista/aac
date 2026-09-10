import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { EventCard } from "@/components/sections/EventsPreview";
import { Empty } from "@/components/ui/Empty";
import { Reveal } from "@/components/motion/Reveal";
import { getEvents, getArchive } from "@/lib/cms";

export const metadata = pageMetadata({
  title: "Events",
  description:
    "Cancer screenings, campus outreach, training and community sessions run by All Against Cancer across Nigeria, Ghana and Kenya.",
  path: "/events",
});

/**
 * Events.
 *
 * Two lists. Upcoming is events only — a programme that has not finished is
 * running, not forthcoming, and belongs on /programmes.
 *
 * Past is the archive: events that have happened AND programmes that have
 * ended, merged and sorted by when each one finished. A finished programme is
 * a thing AAC did, and it reads as a record of work here rather than as a
 * stale page among the ones still running. Nothing is copied between tables —
 * the card simply links to whichever page owns it.
 */
export default async function EventsPage() {
  const [events, archive] = await Promise.all([getEvents({ upcoming: true }), getArchive()]);

  const upcoming = events;
  const past = archive;
  const total = upcoming.length + past.length;
  const programmes = past.filter((e) => e.kind === "programme").length;

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Where the work happens."
        lede="Every event here actually took place. We publish what we did, where, who was there and what changed — with real photographs, or not at all."
        aside={
          total > 0 ? (
            <p className="mono">
              {total} {total === 1 ? "entry" : "entries"}
              {upcoming.length > 0 && ` · ${upcoming.length} upcoming`}
              {programmes > 0 && ` · ${programmes} completed programme${programmes === 1 ? "" : "s"}`}
            </p>
          ) : null
        }
      />

      <section className="section">
        <div className="wrap">
          {total === 0 ? (
            <Reveal>
              <Empty
                title="Our first events are being documented"
                body="Screenings, campus outreach and training sessions are already running across Nigeria, Ghana and Kenya. Each one is published here once it has happened, with its own photographs and an honest account of what it achieved. Nothing appears before then."
                cta={{ label: "Start a chapter", href: "/get-involved/chapters" }}
              />
            </Reveal>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="mb-24">
                  <Reveal>
                    <p className="mono mb-8 border-b border-[var(--color-border-default)] pb-4">
                      Upcoming
                    </p>
                  </Reveal>
                  <div className="grid gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-14">
                    {upcoming.map((e, i) => (
                      <Reveal key={e.id} delay={(i % 2) * 0.08}>
                        <EventCard e={e} index={i} />
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  {upcoming.length > 0 && (
                    <Reveal>
                      <p className="mono mb-8 border-b border-[var(--color-border-default)] pb-4">
                        What we have done
                      </p>
                    </Reveal>
                  )}
                  <div className="grid gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-14">
                    {past.map((e, i) => (
                      <Reveal key={`${e.kind}-${e.id}`} delay={(i % 2) * 0.08}>
                        <EventCard e={e} index={upcoming.length + i} href={e.href} />
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
