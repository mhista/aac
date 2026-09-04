"use client";

import { useState, useTransition } from "react";
import { submitEnquiry } from "@/lib/forms/actions";
import { TOPICS, TOPIC_LABEL, TOPIC_HINT, type Topic } from "@/lib/forms/shared";
import { Check } from "./Icon";
import { ORG } from "@/lib/org";

/**
 * Contact form.
 *
 * The topic is chosen first and visibly, because it decides who reads the
 * message — patient support goes to a different inbox from a press enquiry,
 * and a support request sitting in a general queue for three days is a real
 * cost to a real person.
 *
 * Choosing "Patient & survivor support" changes what the form says. AAC does
 * not diagnose or advise on treatment, and the honest moment to say so is
 * before someone types out their symptoms hoping for an answer we cannot give.
 */

export function ContactForm({ initialTopic = "general" }: { initialTopic?: Topic }) {
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const field =
    "min-h-[44px] w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-3 text-body text-[var(--color-text-primary)] outline-none transition-colors duration-hover ease-entrance placeholder:text-[var(--color-text-secondary)] focus-visible:border-[var(--color-border-brand)]";

  if (done) {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-7"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-feedback-success-surface)]">
          <Check className="h-4 w-4 text-[var(--color-feedback-success-text)]" />
        </span>
        <div>
          <p className="text-body-l leading-heading text-[var(--color-text-primary)]">
            Your message has reached us.
          </p>
          <p className="measure mt-2 text-body leading-body text-[var(--color-text-secondary)]">
            {topic === "support"
              ? "Someone from our patient and survivor support team will reply. If your situation is urgent, please also speak to a doctor or your nearest health facility — we are not a medical service."
              : "We read everything that comes in and reply within two to five working days. We are a small team and would rather answer properly than quickly."}
          </p>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="mono mt-4 underline underline-offset-4"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] p-7 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await submitEnquiry(data);
          if (res.ok) setDone(true);
          else setError(res.error);
        });
      }}
    >
      <h2 className="display text-[clamp(1.5rem,1.2rem+1.2vw,2rem)]">Send us a message</h2>

      {/* Honeypot. Off-screen rather than hidden — some bots skip display:none. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="mt-6">
        <legend className="mono mb-3">What is it about?</legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <label
              key={t}
              className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-pill border px-4 py-2 text-caption transition-colors duration-hover ${
                topic === t
                  ? "border-transparent bg-[var(--color-action-primary)] text-white"
                  : "border-[var(--color-action-secondary-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-action-secondary-hover-surface)]"
              }`}
            >
              <input
                type="radio"
                name="topic"
                value={t}
                checked={topic === t}
                onChange={() => setTopic(t)}
                className="sr-only"
              />
              {TOPIC_LABEL[t]}
            </label>
          ))}
        </div>
        <p className="mt-3 text-caption leading-body text-[var(--color-text-secondary)]">
          {TOPIC_HINT[topic]}
        </p>
      </fieldset>

      {topic === "support" && (
        <p className="measure mt-5 rounded-md border-l-2 border-[var(--color-feedback-info-base)] bg-[var(--color-feedback-info-surface)] px-4 py-3 text-caption leading-body text-[var(--color-feedback-info-text)]">
          We are not a medical service. We do not diagnose, read results or advise on treatment —
          for that, please see a qualified health professional. What we can do is help you find
          support, information and people who have been through it. If you need help urgently,
          please contact your nearest health facility.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mono mb-2 block">Your name</label>
          <input id="c-name" name="name" required autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="c-email" className="mono mb-2 block">Email</label>
          <input id="c-email" name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
        </div>

        {(topic === "partnership" || topic === "media") && (
          <div>
            <label htmlFor="c-org" className="mono mb-2 block">Organisation</label>
            <input id="c-org" name="organisation" className={field} />
          </div>
        )}

        <div>
          <label htmlFor="c-country" className="mono mb-2 block">
            Country <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input id="c-country" name="country" autoComplete="country-name" className={field} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="c-subject" className="mono mb-2 block">
            Subject <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input id="c-subject" name="subject" className={field} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="c-message" className="mono mb-2 block">Message</label>
          <textarea id="c-message" name="message" rows={6} required className={field} />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-caption leading-body text-[var(--color-feedback-danger-text)]">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-pill bg-[var(--color-action-primary)] px-8 py-4 text-body-l font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
        <p className="mono">
          Or write to {topic === "support" ? ORG.email.support : ORG.email.general}
        </p>
      </div>
    </form>
  );
}
