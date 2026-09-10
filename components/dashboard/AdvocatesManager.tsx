"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  assignAdvocateChapter, deleteAdvocate, saveAdvocateNote, setAdvocateStatus,
} from "@/lib/cms/advocates";
import { BTN, EmptyPanel, inputCls, Notice } from "./ui";
import { useToast } from "./Toast";
import { ConfirmDelete } from "./ConfirmDelete";
import { ChevronDown } from "@/components/ui/Icon";

/**
 * The people who signed up.
 *
 * This is the most sensitive screen in the dashboard — names, phone numbers,
 * and in the motivation field sometimes a diagnosis in the family. It is built
 * to be worked through rather than browsed: the row shows only what you need
 * to decide whether to open it, and everything personal is one deliberate
 * click away rather than sitting on screen while somebody walks past.
 *
 * The status is the whole point of the list. Eight hundred people arrived
 * through a form and nobody could tell which of them had ever been replied to.
 * "New" means nobody has looked yet.
 */

export type Advocate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string[] | null;
  age_range: string | null;
  country: string;
  locality: string | null;
  chapter_id: string | null;
  profile_kind: string | null;
  interests: string[] | null;
  involvement: string | null;
  motivation: string | null;
  school: string | null;
  faculty: string | null;
  study_level: string | null;
  professional_title: string | null;
  workplace: string | null;
  years_experience: string | null;
  occupation: string | null;
  source: string;
  status: string;
  notes: string | null;
  submitted_at: string;
};

const STATUS: Record<string, { label: string; bg: string; fg?: string }> = {
  new: { label: "New", bg: "var(--color-feedback-info-surface)", fg: "var(--color-feedback-info-text)" },
  reviewing: { label: "Being reviewed", bg: "var(--color-feedback-warning-surface)", fg: "var(--color-feedback-warning-text)" },
  accepted: { label: "Accepted", bg: "var(--color-violet-100)", fg: "var(--color-violet-700)" },
  active: { label: "Active", bg: "var(--color-feedback-success-surface)", fg: "var(--color-feedback-success-text)" },
  declined: { label: "Not taken up", bg: "var(--color-neutral-paper-alt)" },
  dormant: { label: "Dormant", bg: "var(--color-neutral-paper-alt)" },
};

const KIND_SHORT: Record<string, string> = {
  Student: "Student",
  "Health Professional": "Health pro",
  "Non-health Volunteer": "Volunteer",
};

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AdvocatesManager({
  advocates,
  chapters,
  canEdit,
  canDelete,
  total,
}: {
  advocates: Advocate[];
  chapters: { id: string; name: string }[];
  canEdit: boolean;
  canDelete: boolean;
  total: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      toast({
        tone: res.ok ? "success" : "danger",
        text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work.",
      });
      router.refresh();
    });

  const chapterName = new Map(chapters.map((c) => [c.id, c.name]));

  if (advocates.length === 0) {
    return (
      <EmptyPanel
        title={total > 0 ? "Nothing matches those filters" : "Nobody has registered yet"}
        body={
          total > 0
            ? "Try clearing a filter, or search for a name or email address."
            : "People who register at /join appear here. If your existing advocates are still in a Google Forms spreadsheet, use Import from Google Forms above to bring them across."
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {advocates.map((a) => {
        const open = openId === a.id;
        const st = STATUS[a.status] ?? { label: a.status, bg: "var(--color-neutral-paper-alt)" };
        const name = `${a.first_name} ${a.last_name}`.trim();

        return (
          <li
            key={a.id}
            className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : a.id)}
                aria-expanded={open}
                className="flex min-w-[200px] flex-1 items-center gap-2 text-left"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform ${open ? "rotate-180" : "-rotate-90"}`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                    {name}
                  </span>
                  <span className="mono mt-0.5 block truncate">
                    {[a.profile_kind ? KIND_SHORT[a.profile_kind] ?? a.profile_kind : null,
                      a.locality, a.country].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>

              <span className="mono">
                {a.chapter_id ? chapterName.get(a.chapter_id) ?? "A chapter" : "No chapter"}
              </span>

              <span className="mono">{when(a.submitted_at)}</span>

              <span
                className="mono rounded-pill px-2 py-1"
                style={{ background: st.bg, color: st.fg }}
              >
                {st.label}
              </span>

              {canEdit && (
                <select
                  value={a.status}
                  disabled={pending}
                  onChange={(e) => run(() => setAdvocateStatus(a.id, e.target.value))}
                  aria-label={`Status for ${name}`}
                  className={`${inputCls} max-w-[170px]`}
                >
                  {Object.entries(STATUS).map(([v, s]) => (
                    <option key={v} value={v}>{s.label}</option>
                  ))}
                </select>
              )}
            </div>

            {open && (
              <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] p-5">
                <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                  <Detail label="Email">
                    <a href={`mailto:${a.email}`} className="underline underline-offset-2">{a.email}</a>
                  </Detail>
                  <Detail label="Phone">
                    {a.phone ? (
                      <a href={`tel:${a.phone.replace(/\s/g, "")}`} className="underline underline-offset-2">
                        {a.phone}
                      </a>
                    ) : "—"}
                  </Detail>

                  {a.profile_kind === "Student" && (
                    <>
                      <Detail label="School">{a.school ?? "—"}</Detail>
                      <Detail label="Course and level">
                        {[a.faculty, a.study_level].filter(Boolean).join(" · ") || "—"}
                      </Detail>
                    </>
                  )}

                  {a.profile_kind === "Health Professional" && (
                    <>
                      <Detail label="Title">{a.professional_title ?? "—"}</Detail>
                      <Detail label="Practises at">
                        {[a.workplace, a.years_experience].filter(Boolean).join(" · ") || "—"}
                      </Detail>
                    </>
                  )}

                  {a.profile_kind === "Non-health Volunteer" && (
                    <>
                      <Detail label="Occupation">{a.occupation ?? "—"}</Detail>
                      <Detail label="Works or studies at">{a.workplace ?? "—"}</Detail>
                    </>
                  )}

                  <Detail label="Wants to be">{a.involvement ?? "—"}</Detail>
                  <Detail label="Registered">
                    {when(a.submitted_at)}
                    <span className="mono ml-2">
                      {a.source === "website" ? "on this site" : "Google Forms"}
                    </span>
                  </Detail>
                </div>

                {a.interests && a.interests.length > 0 && (
                  <div className="mt-4">
                    <p className="mono mb-1.5">Interested in</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.interests.map((i) => (
                        <span
                          key={i}
                          className="mono rounded-pill px-2 py-1"
                          style={{ background: "var(--color-neutral-paper-alt)" }}
                        >
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {a.motivation && (
                  <div className="mt-4">
                    <p className="mono mb-1.5">In their words</p>
                    <p className="max-w-[70ch] whitespace-pre-wrap rounded-dash-sm border border-[var(--color-border-subtle)] bg-white p-3 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
                      {a.motivation}
                    </p>
                  </div>
                )}

                {canEdit && (
                  <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-[var(--color-border-subtle)] pt-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="mono">Chapter</span>
                      <select
                        value={a.chapter_id ?? ""}
                        disabled={pending}
                        onChange={(e) => run(() => assignAdvocateChapter(a.id, e.target.value || null))}
                        className={`${inputCls} min-w-[220px]`}
                      >
                        <option value="">Not attached yet</option>
                        {chapters.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </label>

                    <form
                      action={(fd) => run(() => saveAdvocateNote(a.id, String(fd.get("note") ?? "")))}
                      className="flex flex-1 flex-wrap items-end gap-2"
                    >
                      <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
                        <span className="mono">Note</span>
                        <input
                          name="note"
                          defaultValue={a.notes ?? ""}
                          placeholder="Called 3 Sept, joining the Enugu outreach"
                          className={inputCls}
                        />
                      </label>
                      <button type="submit" disabled={pending} className={BTN.secondary}>Save note</button>
                    </form>

                    {canDelete && (
                      <ConfirmDelete
                        compact
                        icon
                        what={name}
                        consequence="Their registration is removed permanently. Do this only for a duplicate or when they have asked to be removed."
                        action={() => deleteAdvocate(a.id)}
                      />
                    )}
                  </div>
                )}

                {!canEdit && (
                  <div className="mt-4">
                    <Notice tone="info">
                      You can read this list but not change it. Status and chapter are set by
                      coordinators.
                    </Notice>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono mb-1">{label}</p>
      <p className="text-[13px] leading-relaxed text-[var(--color-text-primary)]">{children}</p>
    </div>
  );
}
