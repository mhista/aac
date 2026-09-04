"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Close, Trash } from "@/components/ui/Icon";

/**
 * Delete, from wherever the thing is listed.
 *
 * Two clicks, never one, and the second one names what is about to go. A
 * single-click delete in a list is how the wrong row disappears — the cursor
 * is already moving, the rows are the same height, and there is no undo.
 *
 * Not `window.confirm`: a native dialog cannot say "this is live on the
 * website and its address will stop working", which is the only part of the
 * question that actually matters.
 *
 * The action is passed in already bound to its id, so this component knows
 * nothing about what it is deleting and can sit in any list.
 */
export function ConfirmDelete({
  label = "Delete",
  what,
  consequence,
  action,
  compact = false,
  icon = false,
}: {
  /** Button text. */
  label?: string;
  /** Names the thing, shown in the confirmation. */
  what: string;
  /** What actually happens — especially if it is public. */
  consequence?: string;
  /** A server action already bound to the row's id. */
  action: () => Promise<{ ok: boolean; error?: string; message?: string; id?: string } | void>;
  compact?: boolean;
  /** Icon-only trigger, for dense table rows. Still labelled for screen readers. */
  icon?: boolean;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!armed && icon) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        aria-label={`Delete ${what}`}
        title={consequence ? `Delete ${what} — ${consequence}` : `Delete ${what}`}
        className="grid h-8 w-8 place-items-center rounded-dash-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-feedback-danger-surface)] hover:text-[var(--color-feedback-danger-text)]"
      >
        <Trash className="h-4 w-4" />
      </button>
    );
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        title={consequence ? `${what} — ${consequence}` : `Delete ${what}`}
        className={`mono rounded-pill border border-[var(--color-feedback-danger-base)] text-[var(--color-feedback-danger-text)] transition-colors hover:bg-[var(--color-feedback-danger-surface)] ${
          compact ? "px-2.5 py-1" : "px-4 py-2"
        }`}
      >
        {label}
      </button>
    );
  }

  /* Inside a table row a block panel wrecks the layout, so the compact
     confirmation is a single line of two small buttons instead. Same two
     clicks, same named subject, different shape. */
  if (compact) {
    return (
      <span role="alertdialog" aria-label={`Delete ${what}?`} className="inline-flex flex-wrap items-center gap-1.5">
        <span className="mono text-[var(--color-feedback-danger-text)]">Delete?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await action();
              if (res && !res.ok) setError(res.error ?? "That did not work.");
              else router.refresh();
            })
          }
          className="mono rounded-pill bg-[var(--color-feedback-danger-base)] px-2.5 py-1 text-white disabled:opacity-50"
        >
          {pending ? "…" : "Yes"}
        </button>
        <button
          type="button"
          onClick={() => { setArmed(false); setError(null); }}
          className="mono rounded-pill px-2 py-1 text-[var(--color-text-secondary)]"
        >
          No
        </button>
        {error && (
          <span role="alert" className="mono block w-full text-[var(--color-feedback-danger-text)]">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Delete ${what}?`}
      className="rounded-dash-sm border border-[var(--color-feedback-danger-base)] bg-[var(--color-feedback-danger-surface)] p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] leading-relaxed text-[var(--color-feedback-danger-text)]">
          Delete <strong>{what}</strong>?{consequence ? ` ${consequence}` : ""}
        </p>
        <button
          type="button"
          onClick={() => { setArmed(false); setError(null); }}
          aria-label="Cancel"
          className="shrink-0 text-[var(--color-feedback-danger-text)]"
        >
          <Close className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-[var(--color-feedback-danger-text)]">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await action();
              if (res && !res.ok) setError(res.error ?? "That did not work.");
              else router.refresh();
            })
          }
          className="mono rounded-pill bg-[var(--color-feedback-danger-base)] px-3 py-1.5 text-white disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => { setArmed(false); setError(null); }}
          className="mono rounded-pill px-3 py-1.5 text-[var(--color-feedback-danger-text)]"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
