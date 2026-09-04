"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ROLE_LABEL, type Role } from "@/lib/auth/permissions";
import { inputCls, EmptyPanel, Notice, fmtDateTime } from "./ui";

/**
 * The audit log.
 *
 * Read-only by design and by policy — the table revokes UPDATE and DELETE from
 * every role, so it is append-only in the database rather than merely in the
 * interface. A log somebody can tidy is not a log.
 *
 * Entries are written as verbs by the code that performs the act, and rendered
 * here as sentences: "Ada Obi deleted an event — Campus screening day". The
 * raw action name is kept visible in small type, because when somebody is
 * reading this they are usually trying to reconcile it with something else and
 * the exact string matters.
 */

type Entry = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; email: string | null; role: Role } | null;
};

/* Past tense, because every one of these has already happened. */
const SAYS: Record<string, string> = {
  published: "published",
  unpublished: "took off the site",
  submit_for_review: "sent for review",
  request_changes: "asked for changes to",
  event_deleted: "deleted an event",
  post_deleted: "deleted an article",
  chapter_deleted: "deleted a chapter",
  media_deleted: "deleted a file",
  enquiry_deleted: "deleted an enquiry",
  role_changed: "changed a role",
  status_changed: "changed someone's access",
  applications_opened: "opened applications",
  applications_closed: "closed applications",
  waitlist_notified: "emailed the waitlist",
};

/* Destructive and permission acts are the ones anyone actually comes here
   looking for, so they are visually separated from routine editorial moves. */
const SERIOUS = new Set([
  "event_deleted", "post_deleted", "chapter_deleted", "media_deleted",
  "enquiry_deleted", "role_changed", "status_changed",
]);

function detail(e: Entry) {
  const d = e.diff ?? {};
  const bits: string[] = [];
  if (typeof d.title === "string") bits.push(d.title);
  if (typeof d.role === "string") bits.push(ROLE_LABEL[d.role as Role] ?? d.role);
  if (typeof d.status === "string") bits.push(d.status);
  if (typeof d.subject === "string") bits.push(`“${d.subject}”`);
  if (typeof d.sent === "number") bits.push(`${d.sent} sent`);
  if (typeof d.note === "string") bits.push(`“${d.note}”`);
  if (typeof d.url === "string") bits.push(String(d.url).split("/").pop() ?? "");
  return bits.filter(Boolean).join(" · ");
}

export function AuditLog({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlySerious, setOnlySerious] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (onlySerious && !SERIOUS.has(e.action)) return false;
      if (!needle) return true;
      return [
        e.actor?.full_name, e.actor?.email, e.action, e.entity_type,
        SAYS[e.action], detail(e),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [entries, q, onlySerious]);

  return (
    <div className="space-y-4">
      <Notice tone="info" title="This record cannot be edited">
        The database refuses updates and deletions on this table, not just the interface. Entries
        are written by the actions that perform them, so what is here is what happened.
      </Notice>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOnlySerious((v) => !v)}
          className={`mono rounded-pill px-3 py-1.5 transition-colors ${
            onlySerious
              ? "bg-[var(--color-action-primary)] text-white"
              : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
          }`}
        >
          Deletions &amp; permissions only
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by person, action or title"
          aria-label="Search the audit log"
          className={`${inputCls} ml-auto max-w-[320px]`}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyPanel
          title={entries.length === 0 ? "Nothing recorded yet" : "Nothing matches"}
          body={
            entries.length === 0
              ? "Publishing, deleting, and changing someone's role are all recorded here as they happen."
              : "Try a different search, or clear the filter."
          }
        />
      ) : (
        <ol className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white">
          {shown.map((e) => {
            const who = e.actor?.full_name ?? e.actor?.email ?? "Someone no longer on the system";
            const what = SAYS[e.action] ?? e.action.replace(/_/g, " ");
            const extra = detail(e);
            const serious = SERIOUS.has(e.action);

            return (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[var(--color-border-subtle)] px-5 py-3 last:border-0"
                style={serious ? { background: "var(--color-feedback-danger-surface)" } : undefined}
              >
                <span className="text-[13px] text-[var(--color-text-primary)]">
                  <strong className="font-medium">{who}</strong> {what}
                  {extra && <span className="text-[var(--color-text-secondary)]"> — {extra}</span>}
                </span>
                <span className="mono ml-auto whitespace-nowrap">
                  {e.actor?.role ? `${ROLE_LABEL[e.actor.role]} · ` : ""}
                  {fmtDateTime(e.created_at)}
                </span>
                <span className="mono w-full opacity-60">
                  {e.action}
                  {e.entity_type ? ` · ${e.entity_type}` : ""}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {entries.length >= 500 && (
        <p className="mono">
          Showing the most recent 500 entries.
        </p>
      )}
    </div>
  );
}
