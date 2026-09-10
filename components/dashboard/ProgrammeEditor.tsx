"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveProgramme, setProgrammeStatus } from "@/lib/cms/programmes";
import { BTN, Field, inputCls, Notice, PageHeader, StatusPill } from "./ui";
import { useToast } from "./Toast";
import { ORG } from "@/lib/org";

/**
 * The programme editor.
 *
 * One form, always mounted — the same shape the event editor was rebuilt into
 * after drafts were being wiped. The failure there was fields living inside
 * `{step === n && …}`, which unmounts an uncontrolled input and takes its
 * value with it; anything typed and not yet saved vanished the moment you
 * moved tab. There are no conditional field blocks here for that reason.
 *
 * The dirty flag and the unload guard are the second half of that fix: the
 * browser asks before you leave with unsaved work, and the button says so.
 */

type Programme = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  body: string | null;
  pillar: string | null;
  status: string;
  status_label: string | null;
  target_reach: number | null;
  actual_reach: number | null;
  start_date: string | null;
  end_date: string | null;
  locations: string[] | null;
};

export function ProgrammeEditor({
  programme,
  canPublishNow,
}: {
  programme: Programme;
  canPublishNow: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  /* Leaving with unsaved work should cost a click, not the work. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      toast({
        tone: res.ok ? "success" : "danger",
        text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work.",
      });
      if (res.ok) setDirty(false);
      router.refresh();
    });

  const live = programme.status === "published";
  /* Derived, never stored — the day after the end date it is simply true, with
     nothing to run on a schedule and nothing for anyone to remember. */
  const ended = !!programme.end_date && programme.end_date < new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        title={programme.title || "Untitled programme"}
        description="A programme is the standing work. Events point back to it, so keep the summary something that will still read correctly in a year."
        action={
          <div className="flex items-center gap-3">
            <StatusPill status={programme.status} />
            {live && (
              <Link href={`/programmes/${programme.slug}`} target="_blank" className={BTN.secondary}>
                View live
              </Link>
            )}
          </div>
        }
      />

      {programme.status === "changes_requested" && (
        <div className="mb-5">
          <Notice tone="warning" title="Changes were asked for">
            A reviewer sent this back. Make the changes and send it for review again.
          </Notice>
        </div>
      )}

      <form
        action={(fd) => run(() => saveProgramme(programme.id, fd))}
        onInput={() => setDirty(true)}
        onChange={() => setDirty(true)}
        className="space-y-5 rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 md:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="p-title" required>
              <input id="p-title" name="title" defaultValue={programme.title} className={inputCls} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Subtitle"
              htmlFor="p-subtitle"
              hint="One line under the title. Optional."
            >
              <input id="p-subtitle" name="subtitle" defaultValue={programme.subtitle ?? ""} className={inputCls} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Short summary"
              htmlFor="p-excerpt"
              required
              hint="Two or three sentences. This is what appears on the programmes list and in search results, so it has to make sense on its own."
            >
              <textarea
                id="p-excerpt"
                name="excerpt"
                rows={3}
                defaultValue={programme.excerpt ?? ""}
                className={`${inputCls} min-h-[84px] resize-y`}
              />
            </Field>
          </div>

          <Field label="Pillar" htmlFor="p-pillar" hint="Which of the six this belongs to.">
            <select id="p-pillar" name="pillar" defaultValue={programme.pillar ?? ""} className={inputCls}>
              <option value="">Not set</option>
              {ORG.pillars.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Status label"
            htmlFor="p-status-label"
            hint="Shown on the card, e.g. “Running”, “Pilot”, “Planned”."
          >
            <input
              id="p-status-label"
              name="status_label"
              defaultValue={programme.status_label ?? ""}
              className={inputCls}
            />
          </Field>

          <Field label="Started" htmlFor="p-start">
            <input id="p-start" name="start_date" type="date" defaultValue={programme.start_date ?? ""} className={inputCls} />
          </Field>

          <Field
            label="Ends"
            htmlFor="p-end"
            hint="Leave blank if it is ongoing. Once this date passes, the programme also appears on the Events page under “What we have done”."
          >
            <input id="p-end" name="end_date" type="date" defaultValue={programme.end_date ?? ""} className={inputCls} />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Where it runs"
              htmlFor="p-locations"
              hint="Separated by commas — Enugu, Nsukka, Awka."
            >
              <input
                id="p-locations"
                name="locations"
                defaultValue={(programme.locations ?? []).join(", ")}
                className={inputCls}
              />
            </Field>
          </div>

          <Field
            label="People we aim to reach"
            htmlFor="p-target"
            hint="Leave blank rather than guessing."
          >
            <input
              id="p-target" name="target_reach" type="number" min={0}
              defaultValue={programme.target_reach ?? ""} className={inputCls}
            />
          </Field>

          <Field
            label="People reached so far"
            htmlFor="p-actual"
            hint="Only a number you can evidence. An inflated figure is worse than none."
          >
            <input
              id="p-actual" name="actual_reach" type="number" min={0}
              defaultValue={programme.actual_reach ?? ""} className={inputCls}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="The full description"
              htmlFor="p-body"
              hint="What the programme does, who it is for, and how someone takes part."
            >
              <textarea
                id="p-body"
                name="body"
                rows={14}
                defaultValue={programme.body ?? ""}
                className={`${inputCls} min-h-[300px] resize-y font-[inherit] leading-relaxed`}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Web address"
              htmlFor="p-slug"
              hint={`Appears as /programmes/${programme.slug}. Changing it breaks any link already shared.`}
            >
              <input id="p-slug" name="slug" defaultValue={programme.slug} className={inputCls} spellCheck={false} />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-subtle)] pt-5">
          <button type="submit" disabled={pending} className={BTN.primary}>
            {pending ? "Saving…" : "Save"}
          </button>
          {dirty && <span className="mono">Unsaved changes</span>}
        </div>
      </form>

      {/* Publishing is a separate act from saving, and deliberately outside the
          form — pressing Enter in a text field should never put a page live. */}
      <div className="mt-5 rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 md:p-7">
        <p className="mono mb-1">Where this goes</p>
        <p className="mb-4 max-w-[64ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          {live
            ? "It is on the public site. Archiving takes it down and keeps its history."
            : canPublishNow
              ? "Publishing puts it on the public site straight away."
              : "Send it for review and a coordinator will publish it."}
        </p>

        {live && ended && (
          <div className="mb-4">
            <Notice tone="info" title="This programme has finished">
              It is now listed on the Events page as well, under “What we have done”, and links back
              to this page. There is no second copy to keep up to date — editing it here changes it
              everywhere.
            </Notice>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!live && canPublishNow && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setProgrammeStatus(programme.id, "published"))}
              className={BTN.primary}
            >
              Publish to the site
            </button>
          )}
          {!live && !canPublishNow && programme.status !== "in_review" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setProgrammeStatus(programme.id, "in_review"))}
              className={BTN.primary}
            >
              Send for review
            </button>
          )}
          {live && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setProgrammeStatus(programme.id, "archived"))}
              className={BTN.secondary}
            >
              Take it off the site
            </button>
          )}
          {programme.status === "archived" && canPublishNow && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setProgrammeStatus(programme.id, "published"))}
              className={BTN.secondary}
            >
              Put it back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
