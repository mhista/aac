import { Reveal } from "@/components/motion/Reveal";
import { Button } from "./Button";
import { ArrowUpRight } from "./Icon";
import { CountryPicker } from "./CountryPicker";
import { WaitlistForm } from "./WaitlistForm";
import { getApplicationSettings } from "@/lib/cms";
import { ORG } from "@/lib/org";

/**
 * Application call-to-action.
 *
 * Three states, chosen by the CMS rather than by a deploy:
 *
 *  · OPEN — country forms. Up to five countries show as buttons; past that
 *    CountryPicker collapses them into one control with a search field.
 *  · CLOSED — a waitlist. Applications are not always running, and the person
 *    reading this page is the one most worth keeping hold of, so we take a
 *    name, an email and a country and email them when the intake opens.
 *  · mailtoOnly — for panels that are a conversation between organisations
 *    (partnerships, research, UgwuMind), where a sign-up form reads wrong.
 *    These ignore the open/closed flag entirely; you can always write to us.
 *
 * `interest` tags waitlist rows so the fellowship list and the advocate list
 * can be emailed separately.
 */
export async function ApplyPanel({
  title,
  body,
  subject,
  note,
  mailtoOnly = false,
  interest = "other",
  applyHref,
}: {
  title: string;
  body: string;
  subject: string;
  note?: string;
  mailtoOnly?: boolean;
  interest?: "advocate" | "fellowship" | "chapter" | "volunteer" | "other";
  /**
   * A form on this site that replaces the per-country Google Forms.
   *
   * Advocates apply at /join now. The country buttons stay for the intakes
   * that still run through Google — the country is the first question of our
   * own form, so a picker in front of it would be asking twice.
   */
  applyHref?: string;
}) {
  const settings = mailtoOnly
    ? { open: false, closedNote: null, forms: [] }
    : await getApplicationSettings();

  const hasForms = settings.forms.length > 0;
  const open = settings.open && hasForms;

  return (
    <section className="section">
      <div className="wrap">
        <Reveal>
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] p-8 md:p-12">
            <h2 className="display max-w-[18ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">{title}</h2>
            <p className="measure mt-5 text-body leading-body text-[var(--color-text-secondary)]">{body}</p>

            {mailtoOnly ? (
              <>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button href={`mailto:${ORG.email.general}?subject=${encodeURIComponent(subject)}`} size="lg" arrow>
                    Email us
                  </Button>
                  <Button href="/contact" variant="secondary" size="lg">Ask a question first</Button>
                </div>
                <p className="mono mt-6">{note ?? "We reply within two to five working days."}</p>
              </>
            ) : open && applyHref ? (
              <>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button href={applyHref} size="lg" arrow>Start your application</Button>
                  <Button href="/contact" variant="secondary" size="lg">Ask a question first</Button>
                </div>
                <p className="mono mt-4">Takes about two minutes. Nigeria, Ghana and Kenya.</p>
                <p className="mono mt-6">{note ?? "We reply within two to five working days."}</p>
              </>
            ) : open ? (
              <>
                <p className="mono mt-8 mb-3">Choose your country</p>
                <div className="flex flex-wrap items-center gap-3">
                  <CountryPicker forms={settings.forms} />
                  <Button href="/contact" variant="secondary" size="lg">Ask a question first</Button>
                </div>
                <p className="mono mt-4">
                  Applying from elsewhere? Write to {ORG.email.general} and we will route you.
                </p>
                <p className="mono mt-6">{note ?? "We reply within two to five working days."}</p>
              </>
            ) : (
              <>
                <p className="measure mt-8 text-body leading-body text-[var(--color-text-primary)]">
                  {settings.closedNote ??
                    "Applications are closed at the moment. Leave your details and we will email you the moment the next intake opens — before we announce it anywhere else."}
                </p>
                <WaitlistForm interest={interest} />
                <p className="mono mt-6">
                  {note ?? "One email when applications open. Nothing else, and you can unsubscribe."}
                </p>
              </>
            )}
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
