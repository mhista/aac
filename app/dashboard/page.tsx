import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, canPublish, canSeeCrm, canWrite, atLeast } from "@/lib/auth/permissions";
import { ArrowRight, ArrowUpRight, Plus } from "@/components/ui/Icon";
import { BTN } from "@/components/dashboard/ui";
import { createEventAndOpen } from "@/lib/cms/actions";
import { createPost } from "@/lib/cms/posts";

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

  const scoped = !atLeast(profile, "regional_coordinator") && !!profile.chapter_id;
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

  const hour = new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" });
  const greeting = Number(hour) < 12 ? "Good morning" : Number(hour) < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div>
          <p className="mono mb-2">{ROLE_LABEL[profile.role]}</p>
          <h1 className="font-display text-[28px] leading-tight text-[var(--color-text-display)] sm:text-[34px]">
            {greeting}, {first}
          </h1>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            {scoped
              ? "This is your chapter's work. Anything you create here goes to a coordinator for review before it appears on the site."
              : canPublish(profile)
                ? "You can review and publish content across the organisation."
                : "Here is what is in progress."}
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className={BTN.secondary}>
          View website <ArrowUpRight className="h-4 w-4" />
        </a>
      </header>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="group flex h-full flex-col rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 transition-transform duration-hover hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">{s.label}</span>
                <ArrowRight className="h-4 w-4 -translate-x-1 text-[var(--color-text-secondary)] opacity-0 transition duration-hover group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
              <span className="font-display mt-5 text-[36px] leading-none text-[var(--color-text-display)]">{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-6 rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Start something</h2>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
          New drafts are private until they are reviewed and published.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {/* A real POST, like the button on the events list. The old link
              went to /dashboard/events/new, a retired route that only
              bounced back to the list, so "New event" here did nothing. */}
          {canWrite(profile) && (
            <form action={createEventAndOpen}>
              <button type="submit" className={BTN.primary}>
                <Plus className="h-4 w-4" /> New event
              </button>
            </form>
          )}
          {canWrite(profile) && (
            <form action={createPost}>
              <button type="submit" className={BTN.secondary}>
                <Plus className="h-4 w-4" /> New article
              </button>
            </form>
          )}
          <Link href="/dashboard/media" className={BTN.secondary}>
            Upload photographs
          </Link>
        </div>
      </section>

      {c === null && (
        <p className="mt-6 rounded-dash-md border border-dashed border-[var(--color-border-default)] p-5 text-[13px] text-[var(--color-text-secondary)]">
          The database is not reachable from this environment yet. Once Supabase is
          configured these counts fill in on their own.
        </p>
      )}
    </div>
  );
}
