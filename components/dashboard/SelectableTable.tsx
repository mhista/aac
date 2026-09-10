"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Trash, Close } from "@/components/ui/Icon";
import { useToast } from "./Toast";

/**
 * A list you can act on in bulk.
 *
 * Rows arrive as already-rendered cells from the server component, so this
 * knows nothing about events or articles and both lists share one behaviour.
 *
 * Three decisions:
 *
 * · Only rows you are allowed to delete get a checkbox. Select-all then means
 *   "all the ones you can act on", and the count on the bulk bar is always
 *   honest — never "6 selected" followed by "4 were refused".
 * · The bulk bar appears only once something is selected, and names the number.
 *   A permanently visible toolbar full of disabled buttons is noise.
 * · Deleting several still takes a second, deliberate press. Bulk destruction
 *   deserves at least the friction of one delete.
 */

export type Row = {
  id: string;
  /** Names the row in the confirmation. */
  label: string;
  cells: React.ReactNode[];
  /** Rows without this get no checkbox. */
  selectable: boolean;
  /** Shown in the confirmation when this row is public. */
  warning?: string;
};

export function SelectableTable({
  caption,
  headers,
  rows,
  deleteMany,
  noun = "item",
}: {
  caption: string;
  headers: string[];
  rows: Row[];
  /** Server action, bound at the call site. */
  deleteMany: (ids: string[]) => Promise<{ ok: boolean; error?: string; message?: string; id?: string }>;
  noun?: string;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const selectable = useMemo(() => rows.filter((r) => r.selectable), [rows]);
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.id));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setPicked(allPicked ? new Set() : new Set(selectable.map((r) => r.id)));

  const chosen = rows.filter((r) => picked.has(r.id));
  const anyPublic = chosen.some((r) => r.warning);

  return (
    <div className="space-y-3">
      {picked.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-dash-sm border border-[var(--color-border-brand)] bg-[var(--color-violet-100)] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[var(--color-violet-700)]">
            {picked.size} {noun}
            {picked.size === 1 ? "" : "s"} selected
          </span>

          {!armed ? (
            <button
              type="button"
              onClick={() => setArmed(true)}
              className="mono inline-flex items-center gap-1.5 rounded-pill border border-[var(--color-feedback-danger-base)] px-3 py-1.5 text-[var(--color-feedback-danger-text)] hover:bg-[var(--color-feedback-danger-surface)]"
            >
              <Trash className="h-3.5 w-3.5" />
              Delete
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-[var(--color-feedback-danger-text)]">
                Delete {picked.size}?
                {anyPublic ? " Some are live, and their web addresses will stop working." : ""}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteMany([...picked]);
                    toast({
                      tone: res.ok ? "success" : "danger",
                      text: res.ok
                        ? res.message ?? res.id ?? "Deleted."
                        : res.error ?? "That did not work.",
                    });
                    setPicked(new Set());
                    setArmed(false);
                    router.refresh();
                  })
                }
                className="mono rounded-pill bg-[var(--color-feedback-danger-base)] px-3 py-1.5 text-white disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setArmed(false)}
                className="mono rounded-pill px-2.5 py-1.5 text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => { setPicked(new Set()); setArmed(false); }}
            aria-label="Clear selection"
            className="ml-auto grid h-7 w-7 place-items-center rounded-dash-sm text-[var(--color-violet-700)] hover:bg-white"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-dash-md border border-[var(--color-border-default)] bg-white">
        <table className="w-full text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-[var(--color-border-default)] text-left">
              <th scope="col" className="w-10 px-3 py-3">
                {selectable.length > 0 && (
                  <>
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={allPicked}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-[var(--color-action-primary)]"
                    />
                    <label htmlFor="select-all" className="sr-only">
                      Select all {selectable.length} {noun}s you can delete
                    </label>
                  </>
                )}
              </th>
              {headers.map((h) => (
                <th key={h} scope="col" className="mono px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[var(--color-border-subtle)] last:border-0"
                style={
                  picked.has(r.id) ? { background: "var(--color-violet-100)" } : undefined
                }
              >
                <td className="px-3 py-3">
                  {r.selectable && (
                    <>
                      <input
                        type="checkbox"
                        id={`pick-${r.id}`}
                        checked={picked.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="h-4 w-4 accent-[var(--color-action-primary)]"
                      />
                      <label htmlFor={`pick-${r.id}`} className="sr-only">
                        Select {r.label}
                      </label>
                    </>
                  )}
                </td>
                {r.cells.map((c, i) => (
                  <td key={i} className="px-4 py-3 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
