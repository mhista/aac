"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createImpactReport, deleteImpactReport, saveImpactReport, setReportStatus,
} from "@/lib/cms/impact-reports";
import { BTN, EmptyPanel, Field, inputCls, Notice } from "./ui";
import { useToast } from "./Toast";
import { ConfirmDelete } from "./ConfirmDelete";
import { ChevronDown, Plus } from "@/components/ui/Icon";

/**
 * Impact reports.
 *
 * A chapter files what it did; someone above them verifies it; only verified
 * reports count towards the figures on the public site.
 *
 * The screen is built around that one distinction. The unverified total is
 * shown next to the verified one rather than added into it, because the gap
 * between "what chapters say we did" and "what we can evidence" is exactly the
 * thing an organisation publishing impact numbers has to keep in view. Merging
 * them would be the first step towards a figure nobody can stand behind.
 */

export type Report = {
  id: string;
  title: string;
  description: string | null;
  people_reached: number | null;
  activity_date: string | null;
  chapter_id: string | null;
  advocate_id: string | null;
  status: string;
  verified_at: string | null;
  created_at: string;
};

const STATUS: Record<string, { label: string; bg: string; fg?: string }> = {
  draft: { label: "Draft", bg: "var(--color-neutral-paper-alt)" },
  submitted: { label: "Awaiting verification", bg: "var(--color-feedback-warning-surface)", fg: "var(--color-feedback-warning-text)" },
  verified: { label: "Verified", bg: "var(--color-feedback-success-surface)", fg: "var(--color-feedback-success-text)" },
  rejected: { label: "Sent back", bg: "var(--color-feedback-danger-surface)", fg: "var(--color-feedback-danger-text)" },
};

function when(d: string | null) {
  if (!d) return "No date";
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? "No date"
    : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ImpactReportsManager({
  reports,
  chapters,
  people,
  myId,
  canVerify,
  canVerifyOwn,
  canFile,
  canDelete,
  defaultChapter,
}: {
  reports: Report[];
  chapters: { id: string; name: string }[];
  people: Record<string, string>;
  myId: string;
  canVerify: boolean;
  /** Regional and above may verify a report they filed themselves. */
  canVerifyOwn: boolean;
  canFile: boolean;
  canDelete: boolean;
  defaultChapter: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filing, setFiling] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; id?: string }>) =>
    start(async () => {
      const res = await fn();
      toast({
        tone: res.ok ? "success" : "danger",
        text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work.",
      });
      if (res.ok && res.id) { setFiling(false); setOpenId(res.id); }
      router.refresh();
    });

  const chapterName = new Map(chapters.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      {canFile && (
        filing ? (
          <form
            action={(fd) => run(() => createImpactReport(fd))}
            className="space-y-4 rounded-dash-md border border-[var(--color-border-brand)] bg-white p-5"
          >
            <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
              File an impact report
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="What was it?" htmlFor="ir-title" required>
                  <input
                    id="ir-title" name="title" required
                    placeholder="Cervical cancer screening at Ogui Community Hall"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="When" htmlFor="ir-date" required>
                <input
                  id="ir-date" name="activity_date" type="date" required
                  max={new Date().toISOString().slice(0, 10)}
                  className={inputCls}
                />
              </Field>

              <Field
                label="People reached"
                htmlFor="ir-reached"
                hint="A number you counted, not an estimate. It cannot be verified without one."
              >
                <input id="ir-reached" name="people_reached" type="number" min={0} className={inputCls} />
              </Field>

              {chapters.length > 1 && (
                <div className="sm:col-span-2">
                  <Field label="Chapter" htmlFor="ir-chapter" required>
                    <select
                      id="ir-chapter" name="chapter_id"
                      defaultValue={defaultChapter ?? ""}
                      className={inputCls}
                    >
                      <option value="">Choose a chapter</option>
                      {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                </div>
              )}
              {chapters.length === 1 && (
                <input type="hidden" name="chapter_id" value={chapters[0].id} />
              )}

              <div className="sm:col-span-2">
                <Field
                  label="What happened"
                  htmlFor="ir-desc"
                  hint="What was done, who was there, and what changed. Enough that somebody who was not present can verify it."
                >
                  <textarea id="ir-desc" name="description" rows={4} className={`${inputCls} min-h-[100px] resize-y`} />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={pending} className={BTN.primary}>
                {pending ? "Filing…" : "File it"}
              </button>
              <button type="button" onClick={() => setFiling(false)} className={BTN.secondary}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <button type="button" onClick={() => setFiling(true)} className={BTN.primary}>
              <Plus className="h-4 w-4" /> File a report
            </button>
          </div>
        )
      )}

      {reports.length === 0 ? (
        <EmptyPanel
          title="No reports yet"
          body="An impact report is how an activity becomes a number the organisation can publish. A chapter files what it did; a coordinator above them verifies it; only verified reports count towards the figures on the public site."
        />
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const open = openId === r.id;
            const st = STATUS[r.status] ?? { label: r.status, bg: "var(--color-neutral-paper-alt)" };
            const mine = r.advocate_id === myId;
            const locked = r.status === "verified";

            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : r.id)}
                    aria-expanded={open}
                    className="flex min-w-[220px] flex-1 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform ${open ? "rotate-180" : "-rotate-90"}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                        {r.title}
                      </span>
                      <span className="mono mt-0.5 block truncate">
                        {[
                          when(r.activity_date),
                          r.chapter_id ? chapterName.get(r.chapter_id) : null,
                          r.advocate_id ? people[r.advocate_id] : null,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>

                  <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                    {r.people_reached === null ? (
                      <span className="mono">No number</span>
                    ) : (
                      <>
                        {r.people_reached.toLocaleString()}{" "}
                        <span className="mono">reached</span>
                      </>
                    )}
                  </span>

                  <span className="mono rounded-pill px-2 py-1" style={{ background: st.bg, color: st.fg }}>
                    {st.label}
                  </span>
                </div>

                {open && (
                  <div className="space-y-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] p-5">
                    {locked && (
                      <Notice tone="success" title="Verified">
                        This counts towards the published figures. Reopen it before changing
                        anything — editing a verified report in place would change a number the
                        organisation has already stood behind.
                      </Notice>
                    )}

                    <form
                      action={(fd) => run(() => saveImpactReport(r.id, fd))}
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      <div className="sm:col-span-2">
                        <Field label="What was it?" htmlFor={`t-${r.id}`} required>
                          <input id={`t-${r.id}`} name="title" defaultValue={r.title} disabled={locked} className={inputCls} />
                        </Field>
                      </div>
                      <Field label="When" htmlFor={`d-${r.id}`}>
                        <input
                          id={`d-${r.id}`} name="activity_date" type="date"
                          defaultValue={r.activity_date ?? ""} disabled={locked} className={inputCls}
                        />
                      </Field>
                      <Field label="People reached" htmlFor={`n-${r.id}`}>
                        <input
                          id={`n-${r.id}`} name="people_reached" type="number" min={0}
                          defaultValue={r.people_reached ?? ""} disabled={locked} className={inputCls}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="What happened" htmlFor={`b-${r.id}`}>
                          <textarea
                            id={`b-${r.id}`} name="description" rows={4}
                            defaultValue={r.description ?? ""} disabled={locked}
                            className={`${inputCls} min-h-[100px] resize-y`}
                          />
                        </Field>
                      </div>
                      {!locked && (
                        <div className="sm:col-span-2">
                          <button type="submit" disabled={pending} className={BTN.secondary}>Save</button>
                        </div>
                      )}
                    </form>

                    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-subtle)] pt-4">
                      {canVerify && r.status !== "verified" && (
                        <button
                          type="button"
                          disabled={pending || (mine && !canVerifyOwn)}
                          onClick={() => run(() => setReportStatus(r.id, "verified"))}
                          className={BTN.primary}
                          title={mine && !canVerifyOwn ? "You cannot verify your own report" : undefined}
                        >
                          Verify
                        </button>
                      )}
                      {canVerify && r.status === "submitted" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setReportStatus(r.id, "rejected"))}
                          className={BTN.secondary}
                        >
                          Send back
                        </button>
                      )}
                      {canVerify && r.status === "verified" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setReportStatus(r.id, "submitted"))}
                          className={BTN.secondary}
                        >
                          Reopen
                        </button>
                      )}

                      {(canDelete || (mine && r.status === "draft")) && (
                        <div className="ml-auto">
                          <ConfirmDelete
                            compact
                            icon
                            what={r.title}
                            consequence={
                              r.status === "verified"
                                ? "It is evidence for a published figure, which will drop by that amount."
                                : undefined
                            }
                            action={() => deleteImpactReport(r.id)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
