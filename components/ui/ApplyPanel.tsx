import { Reveal } from "@/components/motion/Reveal";
import { Button } from "./Button";
import { ArrowUpRight } from "./Icon";
import { ORG } from "@/lib/org";

/**
 * Application call-to-action.
 *
 * Applications route to a country-specific form. The previous single link
 * opened a sheet that just listed the same two options, so people chose twice
 * — the choice now happens here, in one tap, before they leave the site.
 *
 * `mailtoOnly` is for panels that are a conversation rather than an
 * application — partnerships, research, UgwuMind — where a sign-up form would
 * read wrong between organisations.
 */
export function ApplyPanel({
  title,
  body,
  subject,
  note,
  mailtoOnly = false,
}: {
  title: string;
  body: string;
  subject: string;
  note?: string;
  mailtoOnly?: boolean;
}) {
  return (
    <section className="section">
      <div className="wrap">
        <Reveal>
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] p-8 md:p-12">
            <h2 className="display max-w-[18ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">{title}</h2>
            <p className="measure mt-5 text-body leading-body text-[var(--color-text-secondary)]">{body}</p>

            {mailtoOnly ? (
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={`mailto:${ORG.email.general}?subject=${encodeURIComponent(subject)}`} size="lg" arrow>
                  Email us
                </Button>
                <Button href="/contact" variant="secondary" size="lg">Ask a question first</Button>
              </div>
            ) : (
              <>
                <p className="mono mt-8 mb-3">Choose your country</p>
                <div className="flex flex-wrap gap-3">
                  {ORG.applicationForms.map((f) => (
                    <a
                      key={f.country}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex min-h-[44px] items-center gap-3 rounded-pill bg-[var(--color-action-primary)] px-6 py-3 text-body font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)]"
                    >
                      Apply — {f.country}
                      <ArrowUpRight className="h-[1.05em] w-[1.05em] shrink-0 transition-transform duration-hover ease-entrance group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  ))}
                  <Button href="/contact" variant="secondary" size="lg">Ask a question first</Button>
                </div>
                <p className="mono mt-4">
                  Applying from elsewhere? Write to {ORG.email.general} and we will route you.
                </p>
              </>
            )}

            <p className="mono mt-6">{note ?? "We reply within two to five working days."}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Handbook download. Sits below the apply panel on advocate-facing pages. */
export function HandbookDownload() {
  const h = ORG.handbook;
  /* Held back while the PDF still carries the legacy organisation name.
     See ORG.handbook.ready. */
  if (!h.ready) return null;
  return (
    <section className="pb-24 md:pb-32">
      <div className="wrap">
        <Reveal>
          <a
            href={h.href}
            download
            className="group flex flex-wrap items-center justify-between gap-6 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-7 transition-shadow duration-hover ease-entrance hover:shadow-lift md:p-9"
          >
            <div className="max-w-[60ch]">
              <p className="mono mb-3">{h.sizeLabel}</p>
              <h2 className="font-display text-[clamp(1.4rem,1.15rem+1.1vw,2rem)] leading-heading text-[var(--color-text-display)]">
                {h.title}
              </h2>
              <p className="mono mt-1.5">{h.subtitle}</p>
              <p className="mt-3 text-caption leading-body text-[var(--color-text-secondary)]">
                {h.description}
              </p>
            </div>
            <span className="inline-flex min-h-[44px] shrink-0 items-center gap-3 rounded-pill border border-[var(--color-action-secondary-border)] px-6 py-3 text-body font-medium text-[var(--color-action-secondary-text)] transition-colors duration-hover ease-entrance group-hover:bg-[var(--color-action-secondary-hover-surface)]">
              Download
              <ArrowUpRight className="h-[1.05em] w-[1.05em] rotate-90 transition-transform duration-hover ease-entrance group-hover:translate-y-0.5" />
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
