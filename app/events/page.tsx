import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { EventCard } from "@/components/sections/EventsPreview";
import { Empty } from "@/components/ui/Empty";
import { Reveal } from "@/components/motion/Reveal";
import { getEvents } from "@/lib/cms";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Events",
  description:
    "Screenings, campus outreach, training and community sessions run by All Against Cancer across Nigeria, Ghana and Kenya.",
};

export default async function EventsPage() {
  const events = await getEvents();
  const upcoming = events.filter((e) => e.starts_at && new Date(e.starts_at) >= new Date());
  const past = events.filter((e) => !e.starts_at || new Date(e.starts_at) < new Date());

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Where the work happens."
        lede="Every event here actually took place. We publish what we did, where, who was there and what changed — with real photographs, or not at all."
        aside={
          events.length > 0 ? (
            <p className="mono">
              {events.length} {events.length === 1 ? "event" : "events"}
              {upcoming.length > 0 && ` · ${upcoming.length} upcoming`}
            </p>
          ) : null
        }
      />

      <section className="section">
        <div className="wrap">
          {events.length === 0 ? (
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
                        Past
                      </p>
                    </Reveal>
                  )}
                  <div className="grid gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-14">
                    {past.map((e, i) => (
                      <Reveal key={e.id} delay={(i % 2) * 0.08}>
                        <EventCard e={e} index={upcoming.length + i} />
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
