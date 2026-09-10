"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setSectionVisible, moveSection } from "@/lib/cms/pages";
import { Notice, EmptyPanel } from "./ui";
import { ArrowRight } from "@/components/ui/Icon";

/**
 * The homepage, as a list you can switch on and off.
 *
 * Reordering is arrows rather than drag and drop. Drag needs a mouse, a steady
 * hand and a large screen; half the people who will use this are on a phone.
 * Two buttons work everywhere, including with a keyboard and a screen reader.
 *
 * A hidden section stays in the list, greyed rather than removed, because the
 * question people arrive with is "what is switched off?" — and something that
 * vanishes when you hide it cannot answer that.
 */

type Section = {
  id: string;
  type: string;
  position: number;
  is_visible: boolean;
};

const LABEL: Record<string, { name: string; what: string }> = {
  hero: { name: "Hero", what: "The opening image, headline and tagline." },
  statement: { name: "Statement", what: "The paragraph about why cancer is not only a medical problem." },
  pillarCards: { name: "The six ways we work", what: "The stacking cards for each pillar." },
  impactStats: { name: "Impact figures", what: "The published numbers, with their methodology notes." },
  leadership: { name: "Leadership", what: "The board and directors, as a preview linking to the About page." },
  featuredEvents: { name: "Recent events", what: "The latest published events, with photographs." },
  countryReach: { name: "Where we work", what: "The Africa map and the active chapters." },
  values: { name: "Values", what: "Compassion, integrity, evidence and the rest." },
  latestPosts: { name: "From the blog", what: "The most recent published articles." },
  getInvolved: { name: "Get involved", what: "The closing call to action." },
};

export function PageSections({
  sections,
  counts,
  canEdit,
}: {
  sections: Section[];
  counts: Record<string, string>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setMsg({ ok: false, text: res.error ?? "That did not work." });
      else if (res.message) setMsg({ ok: true, text: res.message });
      router.refresh();
    });

  const hidden = sections.filter((s) => !s.is_visible).length;

  if (sections.length === 0) {
    return (
      <EmptyPanel
        title="No sections registered"
        body="Run migration 003, which lists the homepage sections. Until then the site shows all of them."
      />
    );
  }

  return (
    <div className="space-y-4">
      {msg && <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice>}

      {!canEdit && (
        <Notice tone="info" title="You can see this but not change it">
          What appears on the front page is set by directors, admins and content leads.
        </Notice>
      )}

      {hidden > 0 && (
        <Notice tone="info">
          {hidden} section{hidden === 1 ? " is" : "s are"} switched off and not on the live site.
        </Notice>
      )}

      <ol className="space-y-2">
        {sections.map((s, i) => {
          const meta = LABEL[s.type] ?? { name: s.type, what: "" };
          const count = counts[s.type];
          const empty = count?.startsWith("No") || count?.startsWith("Nothing");

          return (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-4 rounded-dash-md border border-[var(--color-border-default)] bg-white p-4"
              style={s.is_visible ? undefined : { opacity: 0.55 }}
            >
              <span className="mono w-6 shrink-0 text-center">{i + 1}</span>

              <div className="min-w-[220px] flex-1">
                <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                  {meta.name}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                  {meta.what}
                </p>
              </div>

              {count && (
                <span
                  className="mono rounded-pill px-2 py-1"
                  style={{
                    background: empty
                      ? "var(--color-feedback-warning-surface)"
                      : "var(--color-neutral-paper-alt)",
                    color: empty ? "var(--color-feedback-warning-text)" : undefined,
                  }}
                >
                  {count}
                </span>
              )}

              {canEdit && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pending || i === 0}
                    onClick={() => run(() => moveSection(s.id, "up"))}
                    aria-label={`Move ${meta.name} up`}
                    title="Move up"
                    className="grid h-8 w-8 place-items-center rounded-dash-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)] disabled:opacity-30"
                  >
                    <ArrowRight className="h-4 w-4 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    disabled={pending || i === sections.length - 1}
                    onClick={() => run(() => moveSection(s.id, "down"))}
                    aria-label={`Move ${meta.name} down`}
                    title="Move down"
                    className="grid h-8 w-8 place-items-center rounded-dash-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)] disabled:opacity-30"
                  >
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </button>
                </div>
              )}

              {/* The hero is not switchable. A homepage that starts partway
                  down is not a choice anyone would deliberately make. */}
              {s.type === "hero" ? (
                <span className="mono w-[92px] text-right">Always on</span>
              ) : canEdit ? (
                <label className="flex w-[92px] cursor-pointer items-center justify-end gap-2">
                  <span className="mono">{s.is_visible ? "On" : "Off"}</span>
                  <input
                    type="checkbox"
                    checked={s.is_visible}
                    disabled={pending}
                    onChange={() => run(() => setSectionVisible(s.id, !s.is_visible))}
                    className="h-4 w-4 accent-[var(--color-action-primary)]"
                  />
                </label>
              ) : (
                <span className="mono w-[92px] text-right">{s.is_visible ? "On" : "Off"}</span>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mono">
        Changes appear on the live site immediately.
      </p>
    </div>
  );
}
