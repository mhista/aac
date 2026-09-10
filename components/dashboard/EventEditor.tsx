"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  saveEvent, submitForReview, publishEvent, requestChanges,
  addEventPhoto, updateEventPhoto, deleteEventPhoto, deleteEvent,
} from "@/lib/cms/actions";
import { Field, inputCls, BTN, StatusPill, Notice, toLocalInput } from "./ui";
import { MediaUploader } from "./MediaUploader";
import { ArrowLeft, ArrowRight, Close } from "@/components/ui/Icon";
import type { Profile } from "@/lib/auth/permissions";

/**
 * The event manager — four steps.
 *
 * This is the screen 40+ campus coordinators live in, usually on a phone,
 * often on a bad connection. Three things follow from that:
 *
 *   1. The draft already exists before they arrive, so nothing is lost by
 *      closing the tab.
 *   2. Each step saves independently. There is no "save everything at the end".
 *   3. The submit step tells them exactly what is missing BEFORE they submit,
 *      rather than bouncing them afterwards.
 *
 * The publish control only renders for people who can publish. Everyone else
 * gets "Submit for review", worded as the normal path rather than as a
 * restriction — because for a coordinator it IS the normal path.
 */

type EventRow = {
  id: string; title: string; slug: string; subtitle: string | null;
  event_type: string | null; body: string | null; status: string;
  starts_at: string | null; ends_at: string | null;
  venue: string | null; city: string | null; country: string | null;
  attendance: number | null; screenings_done: number | null;
  materials_distributed: number | null;
};

type Photo = { id: string; url: string; alt: string; caption: string | null; position: number };

const STEPS = ["Details", "Photographs", "Recap", "Submit"] as const;

export function EventEditor({
  event, photos, profile, canPublishNow,
}: {
  event: EventRow;
  photos: Photo[];
  profile: Profile;
  canPublishNow: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  /* Typed-but-unsaved. Shown next to Save, and guarded on unload — the people
     using this are often on a phone with a dying battery, and losing a recap
     they spent ten minutes writing is the worst thing this screen can do. */
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const readOnly = event.status === "in_review" && !canPublishNow;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ tone: "success", text: success });
        setDirty(false);
        router.refresh();
      } else setMsg({ tone: "danger", text: r.error ?? "Something went wrong." });
    });
  }

  /* What still blocks submission — shown before they press it, not after. */
  const blockers: string[] = [];
  if (!event.title || event.title === "Untitled event") blockers.push("Give the event a title");
  if (!event.starts_at) blockers.push("Set the date it happened");
  if (!event.city && !event.country) blockers.push("Add a location");
  if (!event.body) blockers.push("Write the recap");
  const missingAlt = photos.filter((p) => !p.alt?.trim());
  if (missingAlt.length) blockers.push(`Add alt text to ${missingAlt.length} photograph${missingAlt.length === 1 ? "" : "s"}`);

  return (
    <div className="mx-auto max-w-[900px]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/events" className="mono mb-3 inline-flex items-center gap-1.5 hover:text-[var(--color-text-primary)]">
            <ArrowLeft className="h-3.5 w-3.5" /> All events
          </Link>
          <h1 className="font-display text-[clamp(1.4rem,1.2rem+1vw,2rem)] text-[var(--color-text-display)]">
            {event.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={event.status} />
          {event.status === "published" && (
            <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className="mono hover:text-[var(--color-text-primary)]">
              View live
            </a>
          )}
        </div>
      </div>

      {event.status === "changes_requested" && (
        <div className="mb-5">
          <Notice tone="warning" title="A reviewer asked for changes">
            Have a look at what they flagged, make the edits, then submit it again.
          </Notice>
        </div>
      )}

      {readOnly && (
        <div className="mb-5">
          <Notice tone="info" title="With a reviewer">
            This is being reviewed, so it is locked for now. If you need to change something,
            ask your coordinator to send it back.
          </Notice>
        </div>
      )}

      {/* Steps */}
      <nav aria-label="Steps" className="mb-6 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              aria-current={active ? "step" : undefined}
              className={clsx(
                "mono inline-flex min-h-[36px] items-center gap-2 rounded-pill px-3.5 transition-colors duration-hover",
                active
                  ? "bg-[var(--color-action-primary)] !text-white"
                  : done
                    ? "bg-[var(--color-violet-100)] !text-[var(--color-violet-700)]"
                    : "border border-[var(--color-border-default)] hover:bg-[var(--color-surface-page-alt)]"
              )}
            >
              {String(i + 1).padStart(2, "0")} {s}
            </button>
          );
        })}
      </nav>

      {msg && (
        <div className="mb-5">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      {/*
        ONE form, and every field stays mounted whichever step is showing.

        This used to be four separate panels, each rendered with `{step === n &&
        …}`. Two things went wrong, and together they wiped drafts:

        1. Switching step UNMOUNTED the panel. Every field is uncontrolled
           (defaultValue), so anything typed and not yet saved was destroyed —
           and "Next: photographs" did not save first.
        2. Each panel carried the other panel's values as hidden inputs read
           from the SERVER row. So saving the recap wrote `title` back as
           "Untitled event" if a title had been typed but not saved. The editor
           reverted work rather than merely losing it.

        Hiding instead of unmounting fixes the first. Having one form with the
        real fields — no mirrors — fixes the second: the save always sends what
        is actually on screen.

        `hidden` is the attribute, not the Tailwind class, and these panels
        carry no display utility. A `flex` or `grid` class on the same element
        would beat `[hidden]` and the panel would stay visible.
      */}
      <form
        action={(fd) => run(() => saveEvent(event.id, fd), "Saved.")}
        onInput={() => setDirty(true)}
        className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 md:p-7"
      >
        {/* Submitted from every step, so the slug is never dropped. */}
        <input type="hidden" name="slug" value={event.slug} />

        {/* ── 01 Details ───────────────────────────────────────────── */}
        <div hidden={step !== 0} className="space-y-5">
            <Field label="Title" required htmlFor="title" hint="What would you call this if you were telling someone about it?">
              <input id="title" name="title" defaultValue={event.title === "Untitled event" ? "" : event.title}
                     className={inputCls} disabled={readOnly} placeholder="Cervical cancer screening at UNN" />
            </Field>

            <Field label="Subtitle" htmlFor="subtitle" hint="One line. Optional.">
              <input id="subtitle" name="subtitle" defaultValue={event.subtitle ?? ""} className={inputCls} disabled={readOnly} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Type" htmlFor="event_type">
                <select id="event_type" name="event_type" defaultValue={event.event_type ?? ""} className={inputCls} disabled={readOnly}>
                  <option value="">Choose…</option>
                  {["Screening", "Outreach", "Training", "Webinar", "Conference"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Attendance" htmlFor="attendance" hint="Roughly how many people were there?">
                <input id="attendance" name="attendance" type="number" min="0" defaultValue={event.attendance ?? ""} className={inputCls} disabled={readOnly} />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Starts" required htmlFor="starts_at">
                <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toLocalInput(event.starts_at)} className={inputCls} disabled={readOnly} />
              </Field>
              <Field label="Ends" htmlFor="ends_at" hint="Only if it ran over more than one day.">
                <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toLocalInput(event.ends_at)} className={inputCls} disabled={readOnly} />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Venue" htmlFor="venue">
                <input id="venue" name="venue" defaultValue={event.venue ?? ""} className={inputCls} disabled={readOnly} />
              </Field>
              <Field label="City" htmlFor="city">
                <input id="city" name="city" defaultValue={event.city ?? ""} className={inputCls} disabled={readOnly} />
              </Field>
              <Field label="Country" required htmlFor="country">
                <select id="country" name="country" defaultValue={event.country ?? ""} className={inputCls} disabled={readOnly}>
                  <option value="">Choose…</option>
                  {["Nigeria", "Ghana", "Kenya"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Screenings done" htmlFor="screenings_done">
                <input id="screenings_done" name="screenings_done" type="number" min="0" defaultValue={event.screenings_done ?? ""} className={inputCls} disabled={readOnly} />
              </Field>
              <Field label="Materials distributed" htmlFor="materials_distributed">
                <input id="materials_distributed" name="materials_distributed" type="number" min="0" defaultValue={event.materials_distributed ?? ""} className={inputCls} disabled={readOnly} />
              </Field>
            </div>

        </div>

        {/* ── 03 Recap ─────────────────────────────────────────────── */}
        <div hidden={step !== 2} className="space-y-5">
            <Field
              label="What happened"
              required
              htmlFor="body"
              hint="What did you do, who came, and what changed because you were there? Plain language. Two or three paragraphs is plenty — separate them with a blank line."
            >
              <textarea
                id="body"
                name="body"
                defaultValue={event.body ?? ""}
                rows={14}
                className={`${inputCls} resize-y leading-relaxed`}
                disabled={readOnly}
                placeholder={"We ran a cervical cancer screening at…\n\n143 women were screened, and…\n\nWhat surprised us was…"}
              />
            </Field>

        </div>

        {/* One save, whichever editing step is showing, because one form now
           holds every field. Steps 02 and 04 have nothing to save. */}
        {(step === 0 || step === 2) && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--color-border-subtle)] pt-6">
            <button type="submit" className={BTN.primary} disabled={pending || readOnly}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setStep(step === 0 ? 1 : 3)}
              className={BTN.secondary}
            >
              {step === 0 ? "Next: photographs" : "Next: submit"} <ArrowRight className="h-4 w-4" />
            </button>
            {dirty && (
              <span className="mono text-[var(--color-feedback-warning-text)]">
                Unsaved changes
              </span>
            )}
          </div>
        )}
      </form>

      {/* ── 02 Photographs ─────────────────────────────────────────
         Outside the form: it has its own per-photograph actions, and nesting
         them inside would submit stray fields to the event save. Kept mounted
         so half-typed alt text survives a step change too. */}
      <div
        hidden={step !== 1}
        className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 md:p-7"
      >
        <PhotosStep
          eventId={event.id}
          photos={photos}
          readOnly={readOnly}
          pending={pending}
          run={run}
          onNext={() => setStep(2)}
        />
      </div>

      {/* ── 04 Submit ────────────────────────────────────────────── */}
      <div
        hidden={step !== 3}
        className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 md:p-7"
      >
        <div className="space-y-6">
            <div>
              <h2 className="font-display text-[1.35rem] text-[var(--color-text-display)]">Ready to go?</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                {canPublishNow
                  ? "You can publish this yourself, or send it for another pair of eyes first."
                  : "Your coordinator reviews it, then publishes. You will see the status change here."}
              </p>
            </div>

            <dl className="divide-y divide-[var(--color-border-default)] rounded-dash-sm border border-[var(--color-border-default)]">
              {[
                ["Title", event.title === "Untitled event" ? null : event.title],
                ["Date", event.starts_at ? new Date(event.starts_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null],
                ["Location", [event.venue, event.city, event.country].filter(Boolean).join(", ") || null],
                ["Photographs", photos.length ? `${photos.length}` : null],
                ["Recap", event.body ? `${event.body.trim().split(/\s+/).length} words` : null],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-6 px-4 py-3">
                  <dt className="mono">{k}</dt>
                  <dd className={clsx("text-[13px]", v ? "text-[var(--color-text-primary)]" : "text-[var(--color-feedback-danger-text)]")}>
                    {v ?? "Not set"}
                  </dd>
                </div>
              ))}
            </dl>

            {blockers.length > 0 ? (
              <Notice tone="warning" title="A few things first">
                <ul className="mt-1 list-inside list-disc space-y-1">
                  {blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </Notice>
            ) : (
              <Notice tone="success">Everything needed is here.</Notice>
            )}

            <div className="flex flex-wrap gap-3">
              {canPublishNow ? (
                <>
                  <button
                    type="button"
                    disabled={pending || blockers.length > 0}
                    onClick={() => run(() => publishEvent(event.id), "Published. It is live on the site now.")}
                    className={BTN.primary}
                  >
                    {pending ? "Publishing…" : "Publish"}
                  </button>
                  {event.status === "in_review" && (
                    <SendBack eventId={event.id} pending={pending} run={run} />
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={pending || blockers.length > 0 || event.status === "in_review"}
                  onClick={() => run(() => submitForReview(event.id), "Sent for review. Your coordinator has it now.")}
                  className={BTN.primary}
                >
                  {event.status === "in_review" ? "Already with a reviewer" : pending ? "Sending…" : "Submit for review"}
                </button>
              )}
              <button type="button" onClick={() => setStep(0)} className={BTN.ghost}>
                Back to details
              </button>
            </div>
          </div>
      </div>

      <DangerZone event={event} canDeletePublished={canPublishNow} />
    </div>
  );
}

/* ── Danger zone ───────────────────────────────────────────────────
   Deliberately at the bottom, away from "View live", and behind a second
   click. Deleting a published event breaks a URL that may be linked from a
   partner's site or a funding application, so the confirmation says exactly
   that rather than a generic "are you sure?". */
function DangerZone({
  event,
  canDeletePublished,
}: {
  event: EventRow;
  canDeletePublished: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublic = event.status === "published" || event.status === "scheduled";
  const blocked = isPublic && !canDeletePublished;

  return (
    <div className="mt-10 rounded-dash-md border border-[var(--color-feedback-danger-base)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Delete this event</p>
          <p className="mt-1 max-w-[60ch] text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            {blocked
              ? "This event is live on the website. A regional coordinator or an admin can remove it."
              : isPublic
                ? "It will disappear from the website immediately, and its web address will stop working."
                : "It has never been public, so nothing outside the dashboard changes."}
          </p>
        </div>
        {!blocked && !armed && (
          <button type="button" onClick={() => setArmed(true)} className={BTN.danger}>
            Delete
          </button>
        )}
      </div>

      {armed && !blocked && (
        <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-4">
          <p className="text-[13px] text-[var(--color-text-primary)]">
            Delete “{event.title}” permanently? Its photographs are removed from this event but stay
            in the media library.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-[12px] text-[var(--color-feedback-danger-text)]">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={working}
              onClick={async () => {
                setWorking(true);
                setError(null);
                /* On success this redirects, so nothing after it runs. A
                   returned value therefore always means a refusal. */
                const res = await deleteEvent(event.id);
                setWorking(false);
                if (res && !res.ok) setError(res.error);
              }}
              className={BTN.danger}
            >
              {working ? "Deleting…" : "Yes, delete permanently"}
            </button>
            <button type="button" onClick={() => setArmed(false)} className={BTN.ghost}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Photos step ───────────────────────────────────────────────────
   Alt text is a required field, not an optional extra. An events gallery
   without it is unusable on a screen reader, and this is the only moment
   anyone will ever know what the photograph shows. */
function PhotosStep({
  eventId, photos, readOnly, pending, run, onNext,
}: {
  eventId: string; photos: Photo[]; readOnly: boolean; pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      {!readOnly && (
        <MediaUploader
          folder="/events"
          label="Add photographs or video"
          hint="Straight from your phone or computer. Choose as many as you like — they upload together. Add a description to each one below once it lands."
          onUploaded={(r) =>
            run(
              () =>
                addEventPhoto(eventId, {
                  url: r.url,
                  /* Deliberately blank. Alt text is written below, where the
                     person can see the photograph they are describing — and
                     submit-for-review refuses while any is still empty. */
                  alt: "",
                }),
              "Uploaded."
            )
          }
        />
      )}

      {photos.length === 0 ? (
        <p className="rounded-dash-sm border border-dashed border-[var(--color-border-default)] px-4 py-8 text-center text-[13px] text-[var(--color-text-secondary)]">
          No photographs yet. An event page without them is just a claim.
        </p>
      ) : (
        <ul className="space-y-3">
          {photos.map((p, i) => (
            <li key={p.id} className="flex gap-4 rounded-dash-sm border border-[var(--color-border-default)] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt || ""} className="h-20 w-28 shrink-0 rounded-dash-xs object-cover" />
              <div className="min-w-0 flex-1">
                <p className="mono mb-1.5">Photograph {String(i + 1).padStart(2, "0")}</p>
                <input
                  defaultValue={p.alt}
                  disabled={readOnly}
                  onBlur={(e) => {
                    if (e.target.value !== p.alt) {
                      run(() => updateEventPhoto(p.id, eventId, { alt: e.target.value }), "Alt text saved.");
                    }
                  }}
                  className={inputCls}
                  placeholder="Describe this photograph…"
                  aria-label={`Alt text for photograph ${i + 1}`}
                />
                {!p.alt?.trim() && (
                  <p className="mt-1.5 text-[12px] text-[var(--color-feedback-danger-text)]">
                    Needs alt text before this can be submitted.
                  </p>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Remove photograph ${i + 1}`}
                  onClick={() => run(() => deleteEventPhoto(p.id, eventId), "Photograph removed.")}
                  className="grid h-9 w-9 shrink-0 place-items-center self-start rounded-dash-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-feedback-danger-surface)] hover:text-[var(--color-feedback-danger-text)]"
                >
                  <Close className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={onNext} className={BTN.secondary}>
        Next: recap <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* Sending something back without saying why wastes everyone's time, so the
   note is required by the action, not just encouraged here. */
function SendBack({
  eventId, pending, run,
}: {
  eventId: string; pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={BTN.secondary}>
        Request changes
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-dash-sm border border-[var(--color-border-default)] p-4">
      <Field label="What needs changing?" required htmlFor="note" hint="The person who wrote this will read exactly these words.">
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} className={`${inputCls} resize-y`} />
      </Field>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending || !note.trim()}
          onClick={() => run(async () => {
            const r = await requestChanges(eventId, note);
            if (r.ok) { setNote(""); setOpen(false); }
            return r;
          }, "Sent back with your note.")}
          className={BTN.secondary}
        >
          Send back
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BTN.ghost}>Cancel</button>
      </div>
    </div>
  );
}
