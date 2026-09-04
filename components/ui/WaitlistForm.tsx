"use client";

import { useState, useTransition } from "react";
import { joinWaitlist } from "@/lib/waitlist/actions";
import { CONSENT_TEXT } from "@/lib/waitlist/shared";
import { Check } from "./Icon";
import { ORG } from "@/lib/org";

/**
 * Waitlist form — what stands where the apply buttons stand when applications
 * are closed.
 *
 * The point is that a closed intake should still capture the person. Someone
 * who reads the whole advocates page and arrives ready is the single most
 * valuable visitor the site gets; sending them away with "check back later"
 * wastes them. So we ask for the four things a batch email needs and nothing
 * else. Everything an application would ask is asked later, in the form.
 *
 * Consent is explicit and unticked by default, and the exact sentence shown
 * here is stored on the row.
 */

const COUNTRY_HINTS = ["Nigeria", "Ghana", "Kenya"];

export function WaitlistForm({
  interest,
  labels,
}: {
  interest: "advocate" | "fellowship" | "chapter" | "volunteer" | "other";
  labels?: { note?: string };
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div
        role="status"
        className="mt-8 flex items-start gap-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-6"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-feedback-success-surface)]">
          <Check className="h-4 w-4 text-[var(--color-feedback-success-text)]" />
        </span>
        <div>
          <p className="text-body-l leading-heading text-[var(--color-text-primary)]">
            You are on the list.
          </p>
          <p className="measure mt-2 text-body leading-body text-[var(--color-text-secondary)]">
            We will email you as soon as this intake opens — one email, with the link and the
            deadline. Nothing else, and you can unsubscribe from it.
          </p>
        </div>
      </div>
    );
  }

  const field =
    "min-h-[44px] w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-3 text-body text-[var(--color-text-primary)] outline-none transition-colors duration-hover ease-entrance placeholder:text-[var(--color-text-secondary)] focus-visible:border-[var(--color-border-brand)]";

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await joinWaitlist(data);
          if (res.ok) setDone(true);
          else setError(res.error);
        });
      }}
    >
      <input type="hidden" name="interest" value={interest} />

      {/* Honeypot. Off-screen rather than display:none, which some bots skip. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={`company-${interest}`}>Company</label>
        <input id={`company-${interest}`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`name-${interest}`} className="mono mb-2 block">
            Your name
          </label>
          <input id={`name-${interest}`} name="full_name" type="text" required autoComplete="name" className={field} />
        </div>

        <div>
          <label htmlFor={`email-${interest}`} className="mono mb-2 block">
            Email
          </label>
          <input
            id={`email-${interest}`}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={field}
          />
        </div>

        <div>
          <label htmlFor={`country-${interest}`} className="mono mb-2 block">
            Country
          </label>
          <input
            id={`country-${interest}`}
            name="country"
            type="text"
            list={`countries-${interest}`}
            autoComplete="country-name"
            className={field}
          />
          <datalist id={`countries-${interest}`}>
            {COUNTRY_HINTS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {interest === "chapter" ? (
          <div>
            <label htmlFor={`inst-${interest}`} className="mono mb-2 block">
              University
            </label>
            <input id={`inst-${interest}`} name="institution" type="text" className={field} />
          </div>
        ) : (
          <div>
            <label htmlFor={`note-${interest}`} className="mono mb-2 block">
              What you do <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id={`note-${interest}`}
              name="note"
              type="text"
              placeholder={labels?.note ?? "Student, nurse, designer…"}
              className={field}
            />
          </div>
        )}
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--color-action-primary)]"
        />
        <span className="measure text-caption leading-body text-[var(--color-text-secondary)]">
          {CONSENT_TEXT}
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-4 text-caption leading-body text-[var(--color-feedback-danger-text)]">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center justify-center gap-3 rounded-pill bg-[var(--color-action-primary)] px-8 py-4 text-body-l font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Adding you…" : "Notify me when applications open"}
        </button>
        <p className="mono">
          Or write to {ORG.email.general}
        </p>
      </div>
    </form>
  );
}
