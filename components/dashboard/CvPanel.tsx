"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getCvLink, parseCv, removeCv } from "@/lib/cms/cv";
import type { CvSummary } from "@/lib/cv/summarise";
import { BTN, Notice } from "./ui";
import { useToast } from "./Toast";

/**
 * The CV on somebody's record.
 *
 * Two things a coordinator does with a CV: open it, and get the gist of it
 * without opening forty of them. So: a download link, and a reading.
 *
 * The reading is always labelled as a reading. It is generated, it can be
 * wrong, and the file it came from is one click away — a coordinator deciding
 * anything about a person should be looking at the document, not at a model's
 * summary of it. Saying so on the panel is cheaper than discovering later that
 * somebody trusted it.
 *
 * The link is fetched on click rather than rendered into the page, because it
 * is a signed URL: putting one in the HTML would mean every CV on screen had a
 * live, shareable address sitting in the page source.
 */
export function CvPanel({
  advocateId,
  filename,
  uploadedAt,
  hasText,
  summary,
  parsedAt,
  canParse,
  canDelete,
}: {
  advocateId: string;
  filename: string | null;
  uploadedAt: string | null;
  hasText: boolean;
  summary: CvSummary | null;
  parsedAt: string | null;
  canParse: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [opening, setOpening] = useState(false);

  if (!filename) return null;

  const open = () => {
    setOpening(true);
    start(async () => {
      const res = await getCvLink(advocateId);
      setOpening(false);
      if (!res.ok) {
        toast({ tone: "danger", text: res.error });
        return;
      }
      /* A new tab rather than a navigation: the coordinator is mid-way through
         a list and should come back to it. */
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  };

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      toast({
        tone: res.ok ? "success" : "danger",
        text: res.ok ? res.message ?? "Done." : res.error ?? "That did not work.",
      });
      router.refresh();
    });

  const when = uploadedAt
    ? new Date(uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="mt-4 rounded-dash-sm border border-[var(--color-border-subtle)] bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px] flex-1">
          <p className="mono mb-0.5">CV</p>
          <p className="truncate text-[13px] text-[var(--color-text-primary)]">
            {filename}
            {when && <span className="mono ml-2">{when}</span>}
          </p>
        </div>

        <button type="button" onClick={open} disabled={pending} className={BTN.secondary}>
          {opening ? "Opening…" : "Open"}
        </button>

        {canParse && hasText && (
          <button
            type="button"
            onClick={() => run(() => parseCv(advocateId))}
            disabled={pending}
            className={BTN.secondary}
          >
            {summary ? "Read again" : "Read it"}
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete this CV permanently? The rest of ${filename ? "the" : "this"} record stays.`)) {
                run(() => removeCv(advocateId));
              }
            }}
            disabled={pending}
            className="mono text-[var(--color-feedback-danger-text)] underline underline-offset-2"
          >
            Delete
          </button>
        )}
      </div>

      {!hasText && (
        <p className="mono mt-2">
          No text could be read from this file — probably a scan. Open it to read it.
        </p>
      )}

      {summary && !summary.empty && (
        <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3">
          <p className="mono mb-2">
            What the CV says
            {parsedAt && (
              <span className="ml-2 normal-case tracking-normal">
                · read automatically, check it against the file
              </span>
            )}
          </p>

          {summary.headline && (
            <p className="mb-2 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
              {summary.headline}
            </p>
          )}

          {summary.years_experience && (
            <p className="mono mb-2">{summary.years_experience} stated</p>
          )}

          {summary.skills && summary.skills.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {summary.skills.map((s) => (
                <span
                  key={s}
                  className="mono rounded-pill px-2 py-1"
                  style={{ background: "var(--color-neutral-paper-alt)" }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {summary.education && summary.education.length > 0 && (
              <div>
                <p className="mono mb-1">Education</p>
                <ul className="space-y-0.5">
                  {summary.education.map((e, i) => (
                    <li key={i} className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                      {[e.qualification, e.institution, e.year].filter(Boolean).join(" · ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.experience && summary.experience.length > 0 && (
              <div>
                <p className="mono mb-1">Experience</p>
                <ul className="space-y-0.5">
                  {summary.experience.map((e, i) => (
                    <li key={i} className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                      {[e.role, e.organisation, e.period].filter(Boolean).join(" · ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {summary.languages && summary.languages.length > 0 && (
            <p className="mono mt-3">Languages · {summary.languages.join(", ")}</p>
          )}

          {summary.notable && (
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
              {summary.notable}
            </p>
          )}
        </div>
      )}

      {summary?.empty && (
        <div className="mt-3">
          <Notice tone="info">
            Nothing useful could be read out of this CV. Open the file instead.
          </Notice>
        </div>
      )}
    </div>
  );
}
