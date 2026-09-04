import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { PhotoStrip } from "@/components/media/PhotoStrip";
import { getEvent, getEventMedia, getEvents } from "@/lib/cms";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.subtitle ?? undefined,
    openGraph: {
      title: event.title,
      description: event.subtitle ?? undefined,
      type: "article",
      images: event.cover?.url ? [event.cover.url] : undefined,
    },
  };
}

function formatRange(a: string | null, b: string | null) {
  if (!a) return null;
  const f = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return b && b !== a ? `${f(a)} → ${f(b)}` : f(a);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const [media, all] = await Promise.all([getEventMedia(event.id), getEvents()]);

  const isUpcoming = !!event.starts_at && new Date(event.starts_at) >= new Date();
  const idx = all.findIndex((e) => e.slug === event.slug);
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : all[0]?.slug !== event.slug ? all[0] : null;

  const facts = [
    { label: "Date", value: formatRange(event.starts_at, event.ends_at) },
    { label: "Venue", value: event.venue },
    { label: "Location", value: [event.city, event.country].filter(Boolean).join(", ") || null },
    { label: "Type", value: event.event_type },
    { label: "Attendance", value: event.attendance ? String(event.attendance) : null },
  ].filter((f) => f.value);

  return (
    <>
      <div className="wrap pt-28 md:pt-36">
        <Link
          href="/events"
          className="group inline-flex items-center gap-2 text-caption text-[var(--color-text-secondary)] transition-colors duration-hover hover:text-[var(--color-text-primary)]"
        >
          <span aria-hidden="true" className="transition-transform duration-hover ease-entrance group-hover:-translate-x-1">←</span>
          All events
        </Link>
      </div>

      {/* Status line + title — the Galerie Holm detail opening */}
      <header className="wrap pt-10 md:pt-14">
        <Reveal>
          <p className="mono flex flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-[7px] w-[7px] rounded-full"
              style={{
                background: isUpcoming
                  ? "var(--color-feedback-success-base)"
                  : "var(--color-text-secondary)",
              }}
            />
            <span>{isUpcoming ? "Upcoming" : "Held"}</span>
            {formatRange(event.starts_at, event.ends_at) && (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatRange(event.starts_at, event.ends_at)}</span>
              </>
            )}
            {(event.city || event.country) && (
              <>
                <span aria-hidden="true">·</span>
                <span>{[event.city, event.country].filter(Boolean).join(", ")}</span>
              </>
            )}
          </p>

          <h1 className="display mt-6 max-w-[18ch] text-[clamp(2.5rem,1.6rem+3.9vw,5rem)]">
            {event.title}
          </h1>

          {event.subtitle && (
            <p className="mt-5 max-w-[56ch] text-body-l leading-lede text-[var(--color-text-secondary)]">
              {event.subtitle}
            </p>
          )}
        </Reveal>
      </header>

      {/* Cover */}
      {event.cover?.url && (
        <div className="wrap mt-12 md:mt-16">
          <Reveal>
            <Img
              src={event.cover.url}
              alt={event.cover.alt}
              ratio="16/9"
              sizes="(max-width:1280px) 100vw, 1280px"
              priority
              className="rounded-xl"
            />
          </Reveal>
        </div>
      )}

      {/* Facts + body */}
      <section className="section pt-16 md:pt-20">
        <div className="wrap grid gap-14 lg:grid-cols-[1fr_2fr] lg:gap-20">
          {facts.length > 0 && (
            <Reveal>
              <dl className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)] lg:sticky lg:top-28">
                {facts.map((f) => (
                  <div key={f.label} className="flex justify-between gap-6 py-3.5">
                    <dt className="mono">{f.label}</dt>
                    <dd className="text-caption text-[var(--color-text-primary)]">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}

          <Reveal delay={0.08}>
            <div className="measure text-body leading-body text-[var(--color-text-primary)]">
              {typeof event.body === "string" && event.body.trim() ? (
                event.body.split("\n\n").map((p, i) => (
                  <p key={i} className="mb-5">{p}</p>
                ))
              ) : (
                <p className="text-[var(--color-text-secondary)]">
                  A full account of this event is being written up and will appear here.
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Photo strip */}
      {media.length > 0 && (
        <section className="pb-24 md:pb-32">
          <div className="wrap mb-6">
            <p className="mono">
              Photographs · {String(media.length).padStart(2, "0")}
            </p>
          </div>
          <PhotoStrip photos={media} title={event.title} />
        </section>
      )}

      {/* Next */}
      {next && (
        <section className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-page-alt)]">
          <Link href={`/events/${next.slug}`} className="group block">
            <div className="wrap flex flex-wrap items-baseline justify-between gap-4 py-14 md:py-20">
              <p className="mono">Next event</p>
              <p className="font-display text-[clamp(1.75rem,1.2rem+2.2vw,3rem)] text-[var(--color-text-display)]">
                {next.title}
                <span aria-hidden="true" className="ml-4 inline-block transition-transform duration-hover ease-entrance group-hover:translate-x-2">→</span>
              </p>
            </div>
          </Link>
        </section>
      )}
    </>
  );
}
