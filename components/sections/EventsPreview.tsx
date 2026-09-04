import Link from "next/link";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { Empty } from "@/components/ui/Empty";
import type { EventRecord } from "@/lib/cms";
import { ArrowRight } from "@/components/ui/Icon";

function dateRange(a: string | null, b: string | null) {
  if (!a) return null;
  const f = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
  return b && b !== a ? `${f(a)} → ${f(b)}` : f(a);
}

export function EventCard({ e, index }: { e: EventRecord; index?: number }) {
  return (
    <Link href={`/events/${e.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-lg">
        <Img
          src={e.cover?.url ?? "outreach-health-post"}
          alt={e.cover?.alt ?? ""}
          ratio="3/2"
          sizes="(max-width:768px) 100vw, 50vw"
          imgClassName="transition-transform duration-[600ms] ease-entrance group-hover:scale-[1.03]"
        />
        {e.event_type && (
          <span className="mono absolute left-4 top-4 rounded-sm bg-[rgba(250,248,244,.92)] px-2 py-1 !text-[var(--color-text-primary)] backdrop-blur-sm">
            {e.event_type}
          </span>
        )}
        {typeof index === "number" && (
          <span className="mono absolute right-4 top-4 !text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">
            № {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="font-display text-[1.5rem] leading-heading text-[var(--color-text-display)]">{e.title}</h3>
        <p className="mono">
          {[dateRange(e.starts_at, e.ends_at), e.city ?? e.country].filter(Boolean).join(" · ")}
        </p>
      </div>
      {e.subtitle && <p className="mt-1 text-caption text-[var(--color-text-secondary)]">{e.subtitle}</p>}
    </Link>
  );
}

export function EventsPreview({ events }: { events: EventRecord[] }) {
  return (
    <section className="section bg-[var(--color-surface-page-alt)]">
      <div className="wrap">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mono mb-4">Events</p>
              <h2 className="display max-w-[14ch] text-[clamp(2.125rem,1.43rem+2.86vw,4rem)]">
                Where the work happens
              </h2>
            </div>
            {events.length > 0 && (
              <Link href="/events" className="group inline-flex items-center gap-2 text-body text-[var(--color-text-emphasis)]">
                All events
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </Reveal>

        <div className="mt-14">
          {events.length === 0 ? (
            <Reveal>
              <Empty
                title="Our first events are being documented"
                body="Screenings, campus outreach and training sessions are already running across Nigeria, Ghana and Kenya. We publish each one here with real photographs and what actually changed — so nothing appears until it has happened."
                cta={{ label: "Start a chapter", href: "/get-involved/chapters" }}
              />
            </Reveal>
          ) : (
            <div className="grid gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-14">
              {events.map((e, i) => (
                <Reveal key={e.id} delay={(i % 2) * 0.08}>
                  <EventCard e={e} index={i} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
