import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { rank, canWrite } from "@/lib/auth/permissions";
import { PageHeader, StatusPill, EmptyPanel, BTN, fmtDate, STATUS, Notice } from "@/components/dashboard/ui";
import { createEventAndOpen, deleteEvent, deleteManyEvents } from "@/lib/cms/actions";
import { ConfirmDelete } from "@/components/dashboard/ConfirmDelete";
import { SelectableTable, type Row } from "@/components/dashboard/SelectableTable";
import { canRemove } from "@/lib/auth/capabilities";
import { Plus } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "draft", "in_review", "changes_requested", "published"] as const;

export default async function EventsList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; deleted?: string }>;
}) {
  const { status, error, deleted } = await searchParams;
  const profile = await getProfile();
  const db = await createClient();
  if (!profile) return null;

  const scoped = rank(profile) < 60 && !!profile.chapter_id;

  let rows: any[] = [];
  if (db) {
    let q = db
      .from("events")
      .select("id,title,slug,status,starts_at,city,country,chapter_id,created_by,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (status && status !== "all") q = q.eq("status", status);
    if (scoped) q = q.eq("chapter_id", profile.chapter_id);
    const { data } = await q;
    rows = data ?? [];
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Events"
        description={
          scoped
            ? "Events for your chapter. Anything you create goes to a coordinator for review before it appears on the site."
            : "Every event across the organisation. Published events are live on the public site."
        }
        action={
          canWrite(profile) ? (
            <form action={createEventAndOpen}>
              <button type="submit" className={BTN.primary}>
                <Plus className="h-4 w-4" /> New event
              </button>
            </form>
          ) : null
        }
      />

      {error && (
        <div className="mb-6">
          <Notice tone="danger" title="Could not create the event">{error}</Notice>
        </div>
      )}

      {deleted && (
        <div className="mb-6">
          <Notice tone="success">
            Event deleted. Its photographs are still in the media library.
          </Notice>
        </div>
      )}

      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? "all") === f;
          return (
            <Link
              key={f}
              href={f === "all" ? "/dashboard/events" : `/dashboard/events?status=${f}`}
              aria-current={active ? "true" : undefined}
              className={`mono rounded-pill px-3 py-1.5 transition-colors duration-hover ${
                active
                  ? "bg-[var(--color-violet-100)] !text-[var(--color-violet-700)]"
                  : "border border-[var(--color-border-default)] hover:bg-[var(--color-surface-page-alt)]"
              }`}
            >
              {f === "all" ? "All" : STATUS[f]?.label ?? f}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <EmptyPanel
          title={status && status !== "all" ? "Nothing with that status" : "No events yet"}
          body={
            status && status !== "all"
              ? "Try a different filter, or create a new event."
              : "An event is how a screening, outreach session or training gets onto the public site — with its own photographs and an honest account of what changed."
          }
          action={
            canWrite(profile) ? (
              <form action={createEventAndOpen}>
                <button type="submit" className={BTN.primary}>Create the first one</button>
              </form>
            ) : undefined
          }
        />
      ) : (
        <SelectableTable
          caption="Events, most recently updated first"
          noun="event"
          headers={["Title", "Status", "Date", "Location", "Updated", ""]}
          deleteMany={deleteManyEvents}
          rows={rows.map((e): Row => {
            const isPublic = e.status === "published" || e.status === "scheduled";
            const mine = e.created_by === profile.id || e.chapter_id === profile.chapter_id;
            const mayDelete = canRemove(profile, "events") || (mine && !isPublic);
            return {
              id: e.id,
              label: e.title,
              selectable: mayDelete,
              warning: isPublic ? "live" : undefined,
              cells: [
                <Link
                  key="t"
                  href={`/dashboard/events/${e.id}`}
                  className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-emphasis)]"
                >
                  {e.title}
                </Link>,
                <StatusPill key="s" status={e.status} />,
                <span key="d" className="text-[var(--color-text-secondary)]">{fmtDate(e.starts_at)}</span>,
                <span key="l" className="text-[var(--color-text-secondary)]">
                  {[e.city, e.country].filter(Boolean).join(", ") || "—"}
                </span>,
                <span key="u" className="text-[var(--color-text-secondary)]">{fmtDate(e.updated_at)}</span>,
                mayDelete ? (
                  <ConfirmDelete
                    key="x"
                    compact
                    icon
                    what={e.title}
                    consequence={isPublic ? "It is live, and its web address will stop working." : undefined}
                    action={deleteEvent.bind(null, e.id)}
                  />
                ) : null,
              ],
            };
          })}
        />
      )}
    </div>
  );
}
