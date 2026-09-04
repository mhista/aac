import { Reveal } from "@/components/motion/Reveal";
import { Button } from "./Button";
import { ORG } from "@/lib/org";

/**
 * Application call-to-action.
 *
 * Applications go to the external form at ORG.applicationFormUrl until the CMS
 * and our own multi-step flow exist. Changing that one constant redirects every
 * Apply button on the site.
 *
 * `mailtoOnly` is for panels that are a conversation rather than an application
 * — partnerships and research collaboration, where a form would be wrong.
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
            <div className="mt-8 flex flex-wrap gap-3">
              {mailtoOnly ? (
                <Button href={`mailto:${ORG.email.general}?subject=${encodeURIComponent(subject)}`} size="lg" arrow>
                  Email us
                </Button>
              ) : (
                <Button href={ORG.applicationFormUrl} size="lg" arrow>
                  Apply now
                </Button>
              )}
              <Button href="/contact" variant="secondary" size="lg">Ask a question first</Button>
            </div>
            <p className="mono mt-6">
              {note ?? "We reply within two to five working days."}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
