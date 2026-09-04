import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, canPublish, canSeeCrm, rank } from "@/lib/auth/permissions";
import { ArrowRight } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

/**
 * Dashboard home — role-aware.
 *
 * A campus coordinator sees their own chapter's work and what is waiting on
 * them. A super admin sees the organisation. Same page, different question:
 * "what needs me today?"
 */
async function counts(chapterId: string | null, scoped: boolean) {
  const db = await createClient();
  if (!db) return null;
  const q = (table: string, build: (b: any) => any) => {
    let b: any = db.from(table).select("*", { count: "exact", head: true });
    b = build(b);
    if (scoped && chapterId) b = b.eq("chapter_id", chapterId);
    return b;
  };
  const [drafts, review, published, apps] = await Promise.all([
    q("events", (b) => b.eq("status", "draft")),
    q("events", (b) => b.eq("status", "in_review")),
    q("events", (b) => b.eq("status", "published")),
    db.from("applications").select("*", { count: "exact", head: true }).eq("status", "applied"),
  ]);
  return {
    drafts: drafts.count ?? 0,
    review: review.count ?? 0,
    published: published.count ?? 0,
    applications: apps.count ?? 0,
  };
}

export default async function DashboardHome() {
  const profile = await getProfile();
  if (!profile) return null;

  const scoped = rank(profile) < 60 && !!profile.chapter_id;
  const c = await counts(profile.chapter_id, scoped);
  const first = (profile.full_name ?? "").split(" ")[0] || "there";

  const stats = [
    { label: scoped ? "Your drafts" : "Drafts", value: c?.drafts ?? 0, href: "/dashboard/events?status=draft" },
    { label: "Awaiting review", value: c?.review ?? 0, href: "/dashboard/events?status=in_review" },
    { label: "Published events", value: c?.published ?? 0, href: "/dashboard/events?status=published" },
    ...(canSeeCrm(profile)
      ? [{ label: "New applications", value: c?.applications ?? 0, href: "/dashboard/applications" }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-8">
        <p className="mono mb-2">{ROLE_LABEL[profile.role]}</p>
        <h1 className="font-display text-[clamp(1.6rem,1.3rem+1.2vw,2.25rem)] text-[var(--color-text-display)]">
          Good to see you, {first}.
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {scoped
            ? "This is your chapter's work. Anything you create here goes to a coordinator for review before it appears on the site."
            : canPublish(profile)
              ? "You can review and publish content across the organisation."
              : "Here is what is in progress."}
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="group block rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 transition-shadow duration-hover hover:shadow-dash-pop"
            >
              <p className="font-display text-[2rem] leading-none text-[var(--color-text-display)]">{s.value}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)]">
                {s.label}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity duration-hover group-hover:opacity-100" />
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="mono mb-3">Start something</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/events/new"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-pill bg-[var(--color-action-primary)] px-5 text-[13px] font-medium text-white hover:bg-[var(--color-action-primary-hover)]"
          >
            New event <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/media"
            className="inline-flex min-h-[40px] items-center rounded-pill border border-[var(--color-action-secondary-border)] px-5 text-[13px] font-medium text-[var(--color-action-secondary-text)] hover:bg-[var(--color-action-secondary-hover-surface)]"
          >
            Upload photographs
          </Link>
        </div>
      </section>

      {c === null && (
        <p className="mt-10 rounded-dash-md border border-dashed border-[var(--color-border-default)] p-5 text-[13px] text-[var(--color-text-secondary)]">
          The database is not reachable from this environment yet. Once Supabase is
          configured these counts fill in on their own.
        </p>
      )}
    </div>
  );
}
