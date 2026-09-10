import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";
import { canRead, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { createPost, deletePost, deleteManyPosts } from "@/lib/cms/posts";
import { ConfirmDelete } from "@/components/dashboard/ConfirmDelete";
import { SelectableTable, type Row } from "@/components/dashboard/SelectableTable";
import { ContentFilters } from "@/components/dashboard/ContentFilters";
import { reachableChapters, canFeature, describeReach, applyReach, seesEverything } from "@/lib/auth/reach";
import { PageHeader, StatusPill, EmptyPanel, BTN, Notice, fmtDate } from "@/components/dashboard/ui";
import { Plus } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function BlogList({
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
  if (!profile) return null;

  if (!canRead(profile, "blog")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Blog" />
        <EmptyPanel title="Not available to your role" body={refusalFor("blog")} />
      </div>
    );
  }

  const db = await createClient();

  /* Two different narrowings, easy to confuse.
     A CONTRIBUTOR sees only what they wrote — they have no remit over anyone
     else's drafts. A CAMPUS COORDINATOR sees their whole chapter, including
     articles their contributors wrote, because reviewing those is the job.
     RLS enforces the chapter half; this only decides what the list offers. */
  const contributorOnly = rank(profile) < 50;
  const oneChapter = rank(profile) < 60 && !!profile.chapter_id;

  const mayFeature = canFeature(profile);
  const chapters = await reachableChapters(profile);

  let rows: any[] = [];
  if (db) {
    let q = db
      .from("posts")
      .select(
        "id,title,slug,status,published_at,updated_at,category_slug,medically_reviewed_by,chapter_id,is_featured,created_by"
      )
      .order("updated_at", { ascending: false })
      .limit(200);

    q = applyReach(q, profile, chapters);

    if (status !== "all") q = q.eq("status", status);
    if (featured) q = q.eq("is_featured", true);
    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    if (chapter === "aac") q = q.is("chapter_id", null);
    else if (chapter !== "all") q = q.eq("chapter_id", chapter);
    if (contributorOnly) q = q.eq("created_by", profile.id);

    const { data } = await q;
    rows = data ?? [];
  }

  const chapterName = new Map(chapters.map((c) => [c.id, c.name]));
  const filtering = status !== "all" || chapter !== "all" || !!search || featured;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Blog"
        description={
          contributorOnly
            ? "Your articles. Anything you write goes to a reviewer before it appears on the site."
            : describeReach(profile, "article")
        }
        action={
          <form action={createPost}>
            <button type="submit" className={BTN.primary}>
              <Plus className="h-4 w-4" /> New article
            </button>
          </form>
        }
      />

      {error && (
        <div className="mb-6">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      {deleted && (
        <div className="mb-6">
          <Notice tone="success">Article deleted.</Notice>
        </div>
      )}

      <ContentFilters
        base="/dashboard/blog"
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
          title={filtering ? "Nothing matches" : "No articles yet"}
          body={
            filtering
              ? "Try a different filter or search, or clear them to see everything."
              : "The blog is how AAC gets found. An article answering a question people actually search — what a symptom means, what screening involves, what a diagnosis costs — reaches further than any campaign."
          }
          action={
            <form action={createPost}>
              <button type="submit" className={BTN.primary}>Write the first one</button>
            </form>
          }
        />
      ) : (
        <SelectableTable
          caption="Articles, most recently edited first"
          noun="article"
          headers={
            oneChapter
              ? ["Title", "Category", "Reviewed by", "Status", "Updated", ""]
              : ["Title", "Whose", "Category", "Reviewed by", "Status", "Updated", ""]
          }
          deleteMany={deleteManyPosts}
          rows={rows.map((p): Row => {
            const isPublic = p.status === "published" || p.status === "scheduled";
            const mayDelete =
              canRemove(profile, "blog") || (p.created_by === profile.id && !isPublic);
            return {
              id: p.id,
              label: p.title,
              selectable: mayDelete,
              warning: isPublic ? "live" : undefined,
              cells: [
                <Link
                  key="t"
                  href={`/dashboard/blog/${p.id}`}
                  className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-emphasis)]"
                >
                  {p.title}
                </Link>,
                ...(oneChapter
                  ? []
                  : [
                      <span key="w" className="flex flex-wrap items-center gap-1.5">
                        <span className="mono">
                          {p.chapter_id ? chapterName.get(p.chapter_id) ?? "A chapter" : "AAC"}
                        </span>
                        {p.is_featured && (
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
                <span key="c" className="text-[var(--color-text-secondary)]">{p.category_slug ?? "—"}</span>,
                <span key="r" className="text-[var(--color-text-secondary)]">{p.medically_reviewed_by ?? "—"}</span>,
                <StatusPill key="s" status={p.status} />,
                <span key="u" className="text-[var(--color-text-secondary)]">{fmtDate(p.updated_at)}</span>,
                mayDelete ? (
                  <ConfirmDelete
                    key="d"
                    compact
                    icon
                    what={p.title}
                    consequence={isPublic ? "It is live, and its web address will stop working." : undefined}
                    action={deletePost.bind(null, p.id)}
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
