import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { createProgrammeAndOpen, deleteProgramme, deleteManyProgrammes } from "@/lib/cms/programmes";
import { reachableChapters, seesEverything } from "@/lib/auth/reach";
import { ConfirmDelete } from "@/components/dashboard/ConfirmDelete";
import { SelectableTable, type Row } from "@/components/dashboard/SelectableTable";
import { ContentFilters } from "@/components/dashboard/ContentFilters";
import { PageHeader, StatusPill, EmptyPanel, BTN, Notice, fmtDate } from "@/components/dashboard/ui";
import { Plus } from "@/components/ui/Icon";
import { ORG } from "@/lib/org";

export const dynamic = "force-dynamic";

/**
 * Programmes.
 *
 * The standing work, as opposed to events, which are the individual things
 * that happen inside it. The distinction is worth keeping sharp because it is
 * the one people get wrong: "Cervical cancer screening" is a programme,
 * "screening day at UNTH, 14 March" is an event.
 */
export default async function ProgrammesList({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; chapter?: string; q?: string; featured?: string;
    error?: string; deleted?: string;
  }>;
}) {
  const sp = await searchParams;
  const { status = "all", chapter = "all", q: search = "", error, deleted } = sp;
  const featured = sp.featured === "1";

  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "programmes")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Programmes" />
        <EmptyPanel title="Not available to your role" body={refusalFor("programmes")} />
      </div>
    );
  }

  const db = await createClient();
  const chapters = await reachableChapters(profile);
  const mayEdit = canEdit(profile, "programmes");

  let rows: any[] = [];
  if (db) {
    let query = db
      .from("programmes")
      .select("id,title,slug,status,pillar,status_label,locations,chapter_id,is_featured,created_by,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (status !== "all") query = query.eq("status", status);
    if (featured) query = query.eq("is_featured", true);
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
    if (chapter === "aac") query = query.is("chapter_id", null);
    else if (chapter !== "all") query = query.eq("chapter_id", chapter);

    const { data } = await query;
    rows = data ?? [];
  }

  const chapterName = new Map(chapters.map((c) => [c.id, c.name]));
  const pillarName = new Map(ORG.pillars.map((p) => [p.slug, p.title]));
  const filtering = status !== "all" || chapter !== "all" || !!search || featured;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Programmes"
        description="The standing work — screening, education, medication access. An event is one thing that happened; a programme is the work it belongs to."
        action={
          mayEdit ? (
            <form action={createProgrammeAndOpen}>
              <button type="submit" className={BTN.primary}>
                <Plus className="h-4 w-4" /> New programme
              </button>
            </form>
          ) : null
        }
      />

      {error && (
        <div className="mb-6">
          <Notice tone="danger" title="Could not create the programme">{error}</Notice>
        </div>
      )}
      {deleted && (
        <div className="mb-6">
          <Notice tone="success">Programme deleted.</Notice>
        </div>
      )}

      <ContentFilters
        base="/dashboard/programmes"
        status={status}
        chapter={chapter}
        q={search}
        featured={featured}
        chapters={chapters}
        showFeatured={mayEdit}
        showAac={seesEverything(profile)}
      />

      {rows.length === 0 ? (
        <EmptyPanel
          title={filtering ? "Nothing matches" : "No programmes yet"}
          body={
            filtering
              ? "Try a different filter or search, or clear them to see everything."
              : "A programme groups the work that runs continuously — a screening initiative, a schools education series, a medication access scheme — and gives it a page that events can point back to."
          }
          action={
            mayEdit ? (
              <form action={createProgrammeAndOpen}>
                <button type="submit" className={BTN.primary}>Create the first one</button>
              </form>
            ) : undefined
          }
        />
      ) : (
        <SelectableTable
          caption="Programmes, most recently updated first"
          noun="programme"
          headers={["Title", "Pillar", "Where", "Status", "Updated", ""]}
          deleteMany={deleteManyProgrammes}
          rows={rows.map((p): Row => {
            const isPublic = p.status === "published";
            const mine = p.created_by === profile.id;
            const mayDelete = canRemove(profile, "programmes") || (mine && !isPublic);

            return {
              id: p.id,
              label: p.title,
              selectable: mayDelete,
              warning: isPublic ? "live" : undefined,
              cells: [
                <span key="t" className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/dashboard/programmes/${p.id}`}
                    className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-emphasis)]"
                  >
                    {p.title}
                  </Link>
                  {p.chapter_id && (
                    <span className="mono">
                      {chapterName.get(p.chapter_id) ?? "A chapter"}
                    </span>
                  )}
                  {p.is_featured && (
                    <span
                      className="mono rounded-pill px-1.5 py-0.5"
                      style={{ background: "var(--color-violet-100)", color: "var(--color-violet-700)" }}
                    >
                      Main site
                    </span>
                  )}
                </span>,
                <span key="p" className="text-[var(--color-text-secondary)]">
                  {p.pillar ? pillarName.get(p.pillar) ?? p.pillar : "—"}
                </span>,
                <span key="l" className="text-[var(--color-text-secondary)]">
                  {(p.locations ?? []).length ? (p.locations as string[]).join(", ") : "—"}
                </span>,
                <StatusPill key="s" status={p.status} />,
                <span key="u" className="text-[var(--color-text-secondary)]">{fmtDate(p.updated_at)}</span>,
                mayDelete ? (
                  <ConfirmDelete
                    key="x"
                    compact
                    icon
                    what={p.title}
                    consequence={isPublic ? "It is live, and its web address will stop working." : undefined}
                    action={deleteProgramme.bind(null, p.id)}
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
