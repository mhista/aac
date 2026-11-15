import { ORG } from "@/lib/org";
import { Phone, MapPin, Chat, Mail, Globe, Clock, ArrowUpRight } from "@/components/ui/Icon";
import { kindLabel, serviceName, telHref, waHref, mapsHref, placeLine, type CarePlace } from "@/lib/care";

/**
 * One place in the care directory.
 *
 * Built around the one thing a visitor came to do: find out where it is and
 * ring them. Name, address and the call button sit at the top, large enough
 * to hit on a phone; everything else is secondary.
 */
export function PlaceCard({ place, highlight }: { place: CarePlace; highlight?: string }) {
  const where = placeLine(place);
  const services = place.services.filter((s) => s !== "cancer-medicines" || place.kind !== "pharmacy");

  return (
    <article className="flex h-full flex-col rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-6 md:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono">{kindLabel(place.kind)}</span>
        {place.is_partner && (
          <span
            className="mono inline-block rounded-pill px-2.5 py-1"
            style={{ background: "var(--color-category-support-surface)", color: "var(--color-category-support-text)" }}
          >
            {ORG.abbr} partner
          </span>
        )}
      </div>

      <h3 className="mt-3 font-display text-[1.375rem] leading-heading text-[var(--color-text-display)]">
        {place.name}
      </h3>

      {where && (
        <p className="mt-3 flex gap-2 text-body leading-body text-[var(--color-text-primary)]">
          <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
          <span>{where}</span>
        </p>
      )}

      {place.summary && (
        <p className="mt-3 text-caption leading-body text-[var(--color-text-secondary)]">{place.summary}</p>
      )}

      {services.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Services">
          {services.map((s) => (
            <li
              key={s}
              className={`rounded-pill border px-2.5 py-1 text-[12.5px] ${
                s === highlight
                  ? "border-[var(--color-text-display)] text-[var(--color-text-display)]"
                  : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
              }`}
            >
              {serviceName(s)}
            </li>
          ))}
        </ul>
      )}

      {place.medicines && (
        <p className="mt-4 text-caption leading-body text-[var(--color-text-secondary)]">
          <span className="font-medium text-[var(--color-text-primary)]">Medicines: </span>
          {place.medicines}
        </p>
      )}

      {place.hours && (
        <p className="mt-3 flex gap-2 text-caption text-[var(--color-text-secondary)]">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          {place.hours}
        </p>
      )}

      <div className="mt-auto pt-6">
        <div className="flex flex-wrap gap-2">
          {place.phone && (
            <a
              href={telHref(place.phone)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-[var(--color-text-display)] px-4 text-[14px] font-medium text-[var(--color-surface-page)] transition-opacity duration-hover hover:opacity-90"
            >
              <Phone className="h-4 w-4" />
              Call {place.phone}
            </a>
          )}
          {place.phone_alt && (
            <a
              href={telHref(place.phone_alt)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-[var(--color-border-default)] px-4 text-[14px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-page-alt)]"
            >
              <Phone className="h-4 w-4" />
              {place.phone_alt}
            </a>
          )}
          {place.whatsapp && (
            <a
              href={waHref(place.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-[var(--color-border-default)] px-4 text-[14px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-page-alt)]"
            >
              <Chat className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption">
          {(place.address || place.city) && (
            <a
              href={mapsHref(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline"
            >
              Directions
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          {place.email && (
            <a
              href={`mailto:${place.email}`}
              className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              {place.email}
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              Website
            </a>
          )}
        </div>

        {place.verified_on && (
          <p className="mt-4 text-[12px] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
            Details last confirmed{" "}
            {new Date(place.verified_on).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </article>
  );
}
