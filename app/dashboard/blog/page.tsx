import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";
import { canRead, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { createPost, deletePost, deleteManyPosts } from "@/lib/cms/posts";
import { ConfirmDelete } from "@/components/dashboard/ConfirmDelete";
import { SelectableTable, type Row } from "@/components/dashboard/SelectableTable";
import { canRemove } from "@/lib/auth/capabilities";
import { PageHeader, StatusPill, EmptyPanel, BTN, Notice, fmtDate, STATUS } from "@/components/dashboard/ui";
import { Plus } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "draft", "in_review", "changes_requested", "published"] as const;

export default async function BlogList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; deleted?: string }>;
}) {
  const { status, error, deleted } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "blog")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Blog" />
        <EmptyPanel
          title="Not available to your role"
          body={refusalFor("blog")}
        />
      </div>
    );
  }

  const db = await createClient();
  /* Contributors see their own work; reviewers see everything. Not a security
     boundary — RLS applies the same rule — but it keeps a contributor's list
     to the things they can actually act on. */
  const scoped = rank(profile) < 60;

  let rows: any[] = [];
  if (db) {
    let q = db
      .from("posts")
      .select("id,title,slug,status,published_at,updated_at,category_slug,medically_reviewed_by,created_by")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (status && status !== "all") q = q.eq("status", status);
    if (scoped) q = q.eq("created_by", profile.id);
    const { data } = await q;
    rows = data ?? [];
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Blog"
        description={
          scoped
            ? "Your articles. Anything you write goes to a reviewer before it appears on the site."
            : "Every article across the organisation. Published articles are live on the public site."
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

      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? "all") === f;
          return (
            <Link
              key={f}
              href={f === "all" ? "/dashboard/blog" : `/dashboard/blog?status=${f}`}
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
          title={status && status !== "all" ? "Nothing with that status" : "No articles yet"}
          body="The blog is how AAC gets found. An article answering a question people actually search — what a symptom means, what screening involves, what a diagnosis costs — reaches further than any campaign."
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
          headers={["Title", "Category", "Reviewed by", "Status", "Updated", ""]}
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
