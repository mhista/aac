"use client";

import { useState, useTransition } from "react";
import { registerAdvocate } from "@/lib/cms/advocates";
import {
  AGE_RANGES, COUNTRIES, EXPERIENCE, GENDERS, INTERESTS, INVOLVEMENT,
  LOCALITY_LABEL, PROFILE_KINDS,
} from "@/lib/advocates/form";
import { Check } from "./Icon";
import { ORG } from "@/lib/org";

/**
 * The advocate application.
 *
 * It asks for exactly what the Google Forms asked for — the same questions,
 * the same option wording — so that the people who joined that way and the
 * people who join here are one list rather than two.
 *
 * It does NOT ask in the same way, and that is deliberate. The Google Form is
 * seven pages with a Next button between each; a student on a phone with
 * patchy data has seven chances to give up. Here it is one page, because the
 * thing that actually makes a form tiring is not the number of questions but
 * the number of times you have to wonder how many are left.
 *
 * Two devices do most of the work:
 *
 *  · The role-specific block appears only after you say what you are. Nobody
 *    ever sees the health-professional questions and the student questions at
 *    the same time, so the form is around ten fields for everyone, not
 *    seventeen.
 *  · Everything optional is marked optional, and there are only three of
 *    those. Unmarked means required, so nothing is a surprise at submit time.
 *
 * The one addition to the Google Form is the updates checkbox, unticked. The
 * old form never asked, so the people imported from it are recorded as not
 * having opted in — this is where that permission starts being asked for
 * properly rather than assumed.
 */

const field =
  "min-h-[44px] w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-3 text-body text-[var(--color-text-primary)] outline-none transition-colors duration-hover ease-entrance placeholder:text-[var(--color-text-secondary)] focus-visible:border-[var(--color-border-brand)]";

function Label({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mono mb-2 block">
      {children}
      {optional && <span className="normal-case tracking-normal"> (optional)</span>}
    </label>
  );
}

function Fieldset({
  legend, hint, children,
}: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-8 border-0 p-0">
      <legend className="mono mb-1 p-0">{legend}</legend>
      {hint && (
        <p className="measure mb-3 text-caption leading-body text-[var(--color-text-secondary)]">{hint}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** A checkbox or radio styled as a pill, which is far easier to hit on a phone. */
function Chip({
  name, value, type, checked, onChange,
}: {
  name: string;
  value: string;
  type: "radio" | "checkbox";
  checked?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="group cursor-pointer">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={onChange ? undefined : false}
        checked={onChange ? checked : undefined}
        onChange={onChange ? () => onChange(value) : undefined}
        className="peer sr-only"
      />
      <span className="inline-flex min-h-[44px] items-center rounded-pill border border-[var(--color-border-default)] px-4 py-2 text-body text-[var(--color-text-secondary)] transition-colors duration-hover ease-entrance hover:border-[var(--color-border-brand)] peer-checked:border-[var(--color-action-primary)] peer-checked:bg-[var(--color-action-primary)] peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
        {value}
      </span>
    </label>
  );
}

export function AdvocateForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [country, setCountry] = useState<string>("Nigeria");
  const [kind, setKind] = useState<string>("");

  if (done) {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-6 md:p-8"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-feedback-success-surface)]">
          <Check className="h-4 w-4 text-[var(--color-feedback-success-text)]" />
        </span>
        <div>
          <p className="text-body-l leading-heading text-[var(--color-text-primary)]">
            You are in. Welcome to {ORG.abbr}.
          </p>
          <p className="measure mt-2 text-body leading-body text-[var(--color-text-secondary)]">
            A coordinator will be in touch about where you fit and what is running near you. If you
            named a university, whoever runs that chapter hears from you first.
          </p>
          <p className="measure mt-3 text-body leading-body text-[var(--color-text-secondary)]">
            Nothing else is needed from you today. If you want to say something in the meantime,
            write to {ORG.email.general}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await registerAdvocate(data);
          if (res.ok) {
            setDone(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            setError(res.error);
          }
        });
      }}
    >
      {/* Honeypot. Off-screen rather than display:none, which some bots skip. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="adv-company">Company</label>
        <input id="adv-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* ── You ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="adv-first">First name</Label>
          <input id="adv-first" name="first_name" required autoComplete="given-name" className={field} />
        </div>
        <div>
          <Label htmlFor="adv-last">Last name</Label>
          <input id="adv-last" name="last_name" required autoComplete="family-name" className={field} />
        </div>
        <div>
          <Label htmlFor="adv-email">Email</Label>
          <input
            id="adv-email" name="email" type="email" required
            autoComplete="email" inputMode="email" className={field}
          />
        </div>
        <div>
          <Label htmlFor="adv-phone">Phone number</Label>
          <input
            id="adv-phone" name="phone" type="tel" required
            autoComplete="tel" inputMode="tel" className={field}
          />
        </div>
        <div>
          <Label htmlFor="adv-country">Country</Label>
          <select
            id="adv-country" name="country" value={country}
            onChange={(e) => setCountry(e.target.value)} className={field}
          >
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="adv-locality" optional>{LOCALITY_LABEL[country] ?? "Where you live"}</Label>
          <input id="adv-locality" name="locality" autoComplete="address-level1" className={field} />
        </div>
      </div>

      <Fieldset legend="Gender">
        {GENDERS.map((g) => <Chip key={g} name="gender" value={g} type="checkbox" />)}
      </Fieldset>

      <Fieldset legend="Age range (optional)">
        {AGE_RANGES.map((a) => <Chip key={a} name="age_range" value={a} type="radio" />)}
      </Fieldset>

      {/* ── What you are ────────────────────────────────────────────── */}
      <Fieldset
        legend="Which best describes you?"
        hint="This decides the two or three questions that come next — nothing else."
      >
        {PROFILE_KINDS.map((k) => (
          <Chip key={k} name="profile_kind" value={k} type="radio" checked={kind === k} onChange={setKind} />
        ))}
      </Fieldset>

      {/* Only the branch that applies is ever rendered, so the fields of the
          other two are never submitted and never have to be cleared. */}
      {kind === "Student" && (
        <div className="mt-6 grid gap-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-5 sm:grid-cols-2 md:p-6">
          <div className="sm:col-span-2">
            <Label htmlFor="adv-school">School or university</Label>
            <input id="adv-school" name="school" required className={field} />
          </div>
          <div>
            <Label htmlFor="adv-faculty">Faculty or department</Label>
            <input id="adv-faculty" name="faculty" required className={field} />
          </div>
          <div>
            <Label htmlFor="adv-level">Level</Label>
            <input id="adv-level" name="study_level" required placeholder="100L, 200L, Final…" className={field} />
          </div>
        </div>
      )}

      {kind === "Health Professional" && (
        <div className="mt-6 grid gap-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-5 sm:grid-cols-2 md:p-6">
          <div>
            <Label htmlFor="adv-title">Professional title</Label>
            <input
              id="adv-title" name="professional_title" required
              placeholder="Pharmacist, nurse, doctor…" className={field}
            />
          </div>
          <div>
            <Label htmlFor="adv-work">Where you work or practise</Label>
            <input id="adv-work" name="workplace" required className={field} />
          </div>
          <div className="sm:col-span-2">
            <p className="mono mb-2">Years of experience</p>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE.map((x) => <Chip key={x} name="years_experience" value={x} type="radio" />)}
            </div>
          </div>
        </div>
      )}

      {kind === "Non-health Volunteer" && (
        <div className="mt-6 grid gap-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-5 sm:grid-cols-2 md:p-6">
          <div>
            <Label htmlFor="adv-occ">Your occupation or field</Label>
            <input
              id="adv-occ" name="occupation" required
              placeholder="Teacher, designer, developer, NGO worker…" className={field}
            />
          </div>
          <div>
            <Label htmlFor="adv-work2" optional>Where you work or study</Label>
            <input id="adv-work2" name="workplace" className={field} />
          </div>
        </div>
      )}

      {/* ── What you want to do ─────────────────────────────────────── */}
      <Fieldset legend="Which areas interest you?" hint="Choose as many as apply.">
        {INTERESTS.map((i) => <Chip key={i} name="interests" value={i} type="checkbox" />)}
      </Fieldset>

      <Fieldset legend="How involved would you like to be?">
        {INVOLVEMENT.map((i) => <Chip key={i} name="involvement" value={i} type="radio" />)}
      </Fieldset>

      <div className="mt-8">
        <Label htmlFor="adv-why">Why do you want to join, and what should we know about you?</Label>
        <p className="measure mb-2 text-caption leading-body text-[var(--color-text-secondary)]">
          A few sentences is plenty. Any experience, anything you have led, or anything you would
          like to lead here.
        </p>
        <textarea id="adv-why" name="motivation" required rows={5} className={`${field} min-h-[132px] resize-y`} />
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3">
        <input
          name="consent_updates" type="checkbox"
          className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--color-action-primary)]"
        />
        <span className="measure text-caption leading-body text-[var(--color-text-secondary)]">
          Send me occasional updates about {ORG.name} — campaigns, screenings and openings near me.
          You can stop these at any time. Leaving this unticked does not affect your application;
          a coordinator will still contact you about it.
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-5 text-caption leading-body text-[var(--color-feedback-danger-text)]">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center justify-center gap-3 rounded-pill bg-[var(--color-action-primary)] px-8 py-4 text-body-l font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Sending…" : "Join as a Cancer Advocate"}
        </button>
        <p className="mono">Takes about two minutes.</p>
      </div>
    </form>
  );
}
