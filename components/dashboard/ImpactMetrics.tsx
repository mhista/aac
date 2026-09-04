"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createMetric, saveMetric, setMetricPublished, deleteMetric } from "@/lib/cms/impact";
import { BTN, Field, inputCls, Notice, EmptyPanel, fmtDate } from "./ui";
import { ConfirmDelete } from "./ConfirmDelete";
import { Plus } from "@/components/ui/Icon";

/**
 * Impact figures.
 *
 * These are the numbers a funder will read and a journalist will quote, so the
 * screen is built to slow the wrong ones down rather than to make entry fast:
 *
 * · The number counted and the text shown are separate fields, side by side.
 *   Seeing "5" and "5+" next to each other is what makes the difference
 *   visible; one field would hide it.
 * · A figure with no methodology note is flagged before anyone tries to
 *   publish it, not after.
 * · A figure with no value is a legitimate state — "we are still building the
 *   system to measure this" — and is labelled as such rather than as broken.
 * · How old each figure is, in words. A number from eight months ago quoted as
 *   current is the most common way an honest organisation misleads.
 */

type Metric = {
  id: string;
  key: string;
  label: string;
  value_numeric: number | null;
  value_display: string | null;
  unit: string | null;
  as_of: string | null;
  is_headline: boolean;
  position: number;
  methodology_note: string | null;
  is_published: boolean;
};

function ageOf(as_of: string | null) {
  if (!as_of) return { text: "No date", stale: true };
  const days = Math.floor((Date.now() - new Date(as_of).getTime()) / 86_400_000);
  if (days < 0) return { text: "Dated in the future", stale: true };
  if (days < 45) return { text: "Current", stale: false };
  if (days < 120) return { text: `${Math.round(days / 30)} months old`, stale: false };
  return { text: `${Math.round(days / 30)} months old`, stale: true };
}

export function ImpactMetrics({
  metrics,
  canEdit,
  canDelete,
}: {
  metrics: Metric[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; id?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setMsg({ ok: false, text: res.error ?? "That did not work." });
      else if (res.message) setMsg({ ok: true, text: res.message });
      if (res.ok && res.id) setOpenId(res.id);
      router.refresh();
    });

  const live = metrics.filter((m) => m.is_published);
  const needsNote = live.filter((m) => !m.methodology_note).length;
  const stale = live.filter((m) => ageOf(m.as_of).stale).length;

  return (
    <div className="space-y-5">
      {msg && <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice>}

      {!canEdit && (
        <Notice tone="info" title="You can see these but not change them">
          Impact figures are edited by directors and admins — they are quoted outside the
          organisation, so they are not a per-chapter setting.
        </Notice>
      )}

      {needsNote > 0 && (
        <Notice tone="warning" title={`${needsNote} live figure${needsNote === 1 ? " has" : "s have"} no methodology note`}>
          A number on its own is a claim. Write how it was counted, so that in a year somebody can
          tell whether it still means the same thing.
        </Notice>
      )}

      {stale > 0 && (
        <Notice tone="info">
          {stale} live figure{stale === 1 ? " is" : "s are"} more than four months old. Worth
          re-counting, or at least re-dating.
        </Notice>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <button type="button" disabled={pending} onClick={() => run(createMetric)} className={BTN.primary}>
            <Plus className="h-4 w-4" /> Add a figure
          </button>
        </div>
      )}

      {metrics.length === 0 ? (
        <EmptyPanel
          title="No figures yet"
          body="Impact figures appear on the homepage and the impact page. Add one for each thing you can actually count."
        />
      ) : (
        <ul className="space-y-3">
          {metrics.map((m) => {
            const open = openId === m.id;
            const age = ageOf(m.as_of);
            const noValue = !m.value_display && m.value_numeric === null;

            return (
              <li key={m.id} className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white">
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <span className="min-w-[70px] font-display text-[1.6rem] leading-none text-[var(--color-text-display)]">
                    {m.value_display ?? (m.value_numeric ?? "—")}
                  </span>

                  <div className="min-w-[200px] flex-1">
                    <p className="text-[14px] font-medium text-[var(--color-text-primary)]">{m.label}</p>
                    <p className="mono mt-0.5">
                      {m.is_headline ? "Headline · " : ""}
                      {m.as_of ? fmtDate(m.as_of) : "no date"}
                      {m.value_numeric !== null && m.value_display && String(m.value_numeric) !== m.value_display
                        ? ` · counted ${m.value_numeric}`
                        : ""}
                    </p>
                  </div>

                  {noValue && (
                    <span className="mono rounded-pill px-2 py-1" style={{ background: "var(--color-feedback-info-surface)" }}>
                      Not yet measured
                    </span>
                  )}
                  {!m.methodology_note && m.is_published && (
                    <span className="mono rounded-pill px-2 py-1" style={{ background: "var(--color-feedback-warning-surface)" }}>
                      No method
                    </span>
                  )}
                  {age.stale && m.is_published && !noValue && (
                    <span className="mono">{age.text}</span>
                  )}

                  <span
                    className="mono rounded-pill px-2 py-1"
                    style={{
                      background: m.is_published
                        ? "var(--color-feedback-success-surface)"
                        : "var(--color-neutral-paper-alt)",
                    }}
                  >
                    {m.is_published ? "Live" : "Hidden"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : m.id)}
                    className={BTN.secondary}
                    aria-expanded={open}
                  >
                    {open ? "Close" : canEdit ? "Edit" : "View"}
                  </button>
                  {canDelete && (
                    <ConfirmDelete
                      compact
                      icon
                      what={m.label}
                      consequence={m.is_published ? "It is live on the homepage." : undefined}
                      action={() => deleteMetric(m.id)}
                    />
                  )}
                </div>

                {open && canEdit && (
                  <div className="space-y-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] p-5">
                    <form action={(fd) => run(() => saveMetric(m.id, fd))} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="What is being counted" htmlFor={`l-${m.id}`} required>
                          <input id={`l-${m.id}`} name="label" defaultValue={m.label} className={inputCls} />
                        </Field>
                        <Field label="Key" htmlFor={`k-${m.id}`} hint="Used in code. Change it only if you know what depends on it.">
                          <input id={`k-${m.id}`} name="key" defaultValue={m.key} className={inputCls} />
                        </Field>

                        <Field
                          label="The number you counted"
                          htmlFor={`n-${m.id}`}
                          hint="Leave empty if it genuinely has not been measured yet."
                        >
                          <input
                            id={`n-${m.id}`}
                            name="value_numeric"
                            type="number"
                            step="any"
                            defaultValue={m.value_numeric ?? ""}
                            className={inputCls}
                          />
                        </Field>
                        <Field
                          label="What the site shows"
                          htmlFor={`d-${m.id}`}
                          hint="“800+” is fine when 800 is a floor. It is not fine when you counted exactly 800."
                        >
                          <input
                            id={`d-${m.id}`}
                            name="value_display"
                            defaultValue={m.value_display ?? ""}
                            className={inputCls}
                            placeholder="800+"
                          />
                        </Field>

                        <Field label="As of" htmlFor={`a-${m.id}`} hint="When it was counted, not when it was typed.">
                          <input id={`a-${m.id}`} name="as_of" type="date" defaultValue={m.as_of ?? ""} className={inputCls} />
                        </Field>
                        <Field label="Order" htmlFor={`p-${m.id}`} hint="Lower numbers come first.">
                          <input id={`p-${m.id}`} name="position" type="number" defaultValue={m.position} className={inputCls} />
                        </Field>
                      </div>

                      <Field
                        label="How it was counted"
                        htmlFor={`mn-${m.id}`}
                        required
                        hint="One sentence. This is what separates a measurement from a claim, and it is shown on the impact page."
                      >
                        <textarea
                          id={`mn-${m.id}`}
                          name="methodology_note"
                          rows={2}
                          defaultValue={m.methodology_note ?? ""}
                          className={inputCls}
                          placeholder="People who completed orientation and are active in a chapter or region."
                        />
                      </Field>

                      <label className="flex items-center gap-2.5 text-[13px] text-[var(--color-text-secondary)]">
                        <input
                          type="checkbox"
                          name="is_headline"
                          defaultChecked={m.is_headline}
                          className="h-4 w-4 accent-[var(--color-action-primary)]"
                        />
                        Show this one on the homepage
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={pending} className={BTN.primary}>Save</button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setMetricPublished(m.id, !m.is_published))}
                          className={BTN.secondary}
                        >
                          {m.is_published ? "Hide from the site" : "Publish to the site"}
                        </button>
                      </div>
                    </form>
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
