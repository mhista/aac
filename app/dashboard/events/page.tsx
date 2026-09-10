import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { rank, canWrite } from "@/lib/auth/permissions";
import { PageHeader, StatusPill, EmptyPanel, BTN, fmtDate, Notice } from "@/components/dashboard/ui";
import { createEventAndOpen, deleteEvent, deleteManyEvents } from "@/lib/cms/actions";
import { ConfirmDelete } from "@/components/dashboard/ConfirmDelete";
import { SelectableTable, type Row } from "@/components/dashboard/SelectableTable";
import { ContentFilters } from "@/components/dashboard/ContentFilters";
import { canRemove } from "@/lib/auth/capabilities";
import { reachableChapters, canFeature, describeReach, applyReach, seesEverything } from "@/lib/auth/reach";
import { Plus } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function EventsList({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    chapter?: string;
    q?: string;
    featured?: string;
    error?: string;
    deleted?: string;
  }>;
}) {
  const sp = await searchParams;
  const { status = "all", chapter = "all", q: search = "", error, deleted } = sp;
  const featured = sp.featured === "1";

  const profile = await getProfile();
  const db = await createClient();
  if (!profile) return null;

  const scoped = rank(profile) < 60 && !!profile.chapter_id;
  const mayFeature = canFeature(profile);

  /* Which chapters this person can even see. RLS already restricts the rows
     coming back; this is what fills the filter menu, and it is derived from
     the same reach rule so the two can never disagree. */
  const chapters = await reachableChapters(profile);

  let rows: any[] = [];
  if (db) {
    let query = db
      .from("events")
      .select("id,title,slug,status,starts_at,city,country,chapter_id,is_featured,created_by,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    query = applyReach(query, profile, chapters);

    if (status !== "all") query = query.eq("status", status);
    if (featured) query = query.eq("is_featured", true);
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
    if (chapter === "aac") query = query.is("chapter_id", null);
    else if (chapter !== "all") query = query.eq("chapter_id", chapter);

    const { data } = await query;
    rows = data ?? [];
  }

  const chapterName = new Map(chapters.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Events"
        description={describeReach(profile, "event")}
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

      <ContentFilters
        base="/dashboard/events"
        status={status}
        chapter={chapter}
        q={search}
        featured={featured}
        chapters={chapters}
        showFeatured={mayFeature}
        showAac={seesEverything(profile)}
      />

      {rows.length === 0 ? (
        <EmptyPanel
          title={
            status !== "all" || chapter !== "all" || search || featured
              ? "Nothing matches"
              : "No events yet"
          }
          body={
            status !== "all" || chapter !== "all" || search || featured
              ? "Try a different filter or search, or clear them to see everything."
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
          headers={
            scoped
              ? ["Title", "Status", "Date", "Location", "Updated", ""]
              : ["Title", "Whose", "Status", "Date", "Location", "Updated", ""]
          }
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
                /* Whose it is, and whether it also runs on the main site.
                   Hidden from people who only ever see one chapter — a column
                   that reads the same on every row is noise. */
                ...(scoped
                  ? []
                  : [
                      <span key="w" className="flex flex-wrap items-center gap-1.5">
                        <span className="mono">
                          {e.chapter_id ? chapterName.get(e.chapter_id) ?? "A chapter" : "AAC"}
                        </span>
                        {e.is_featured && (
                          <span
                            className="mono rounded-pill px-1.5 py-0.5"
                            style={{ background: "var(--color-violet-100)", color: "var(--color-violet-700)" }}
                            title="Also shown on the main AAC website"
                          >
                            Main site
                          </span>
                        )}
                      </span>,
                    ]),
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
