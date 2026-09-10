import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { rank } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { reachableChapters } from "@/lib/auth/reach";
import { PageHeader, EmptyPanel, Notice } from "@/components/dashboard/ui";
import { ImpactReportsManager, type Report } from "@/components/dashboard/ImpactReportsManager";

export const dynamic = "force-dynamic";

const FILTERS: [string, string][] = [
  ["all", "All"],
  ["submitted", "Awaiting verification"],
  ["verified", "Verified"],
  ["rejected", "Sent back"],
  ["draft", "Drafts"],
];

/**
 * Impact reports.
 *
 * Where the numbers on the public site are supposed to come from. A chapter
 * files what it did, someone above them verifies it, and only verified
 * reports count.
 *
 * The two totals at the top are deliberately not added together. "What we can
 * evidence" and "what has been claimed but not checked" are different facts,
 * and an organisation that publishes impact figures has to be able to see the
 * gap between them.
 */
export default async function ImpactReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; chapter?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const chapter = sp.chapter ?? "all";

  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "impactReports")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Impact reports" />
        <EmptyPanel title="Not available to your role" body={refusalFor("impactReports")} />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const chapters = await reachableChapters(profile);

  let q = db
    .from("impact_reports")
    .select("id,title,description,people_reached,activity_date,chapter_id,advocate_id,status,verified_at,created_at")
    .order("activity_date", { ascending: false, nullsFirst: false })
    .limit(300);

  if (status !== "all") q = q.eq("status", status);
  if (chapter !== "all") q = q.eq("chapter_id", chapter);

  const [rows, everything, staff] = await Promise.all([
    q,
    /* The totals are over everything this person can see, not over the current
       filter — a figure that changes when you click a tab is not a figure. */
    db.from("impact_reports").select("people_reached,status").limit(5000),
    db.from("profiles").select("id,full_name,email").limit(1000),
  ]);

  if (rows.error && /relation .* does not exist/i.test(rows.error.message)) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Impact reports" />
        <EmptyPanel
          title="The impact reports table has not been created yet"
          body="Run migrations 001 and 015 in Supabase."
        />
      </div>
    );
  }

  const all = (everything.data ?? []) as { people_reached: number | null; status: string }[];
  const verified = all.filter((r) => r.status === "verified");
  const waiting = all.filter((r) => r.status === "submitted");
  const verifiedReach = verified.reduce((n, r) => n + (r.people_reached ?? 0), 0);
  const waitingReach = waiting.reduce((n, r) => n + (r.people_reached ?? 0), 0);

  const people: Record<string, string> = {};
  for (const p of staff.data ?? []) {
    people[(p as any).id] = (p as any).full_name || (p as any).email || "Someone";
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Impact reports"
        description="What chapters have actually done, and the evidence for it. Only verified reports count towards the figures published on the site."
      />

      {all.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Total
            n={verifiedReach}
            label={`people reached · ${verified.length} verified report${verified.length === 1 ? "" : "s"}`}
            tone="success"
          />
          {waiting.length > 0 && (
            <Total
              n={waitingReach}
              label={`claimed but not yet verified · ${waiting.length} waiting`}
              tone="warning"
            />
          )}
        </div>
      )}

      {waiting.length > 0 && rank(profile) >= 50 && status !== "submitted" && (
        <div className="mb-5">
          <Notice tone="warning" title={`${waiting.length} report${waiting.length === 1 ? "" : "s"} waiting on you`}>
            Until they are checked, the work in them is not counted anywhere.{" "}
            <Link href="/dashboard/impact-reports?status=submitted" className="underline underline-offset-2">
              Review them
            </Link>
            .
          </Notice>
        </div>
      )}

      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(([v, label]) => {
          const active = status === v;
          const href =
            v === "all"
              ? "/dashboard/impact-reports"
              : `/dashboard/impact-reports?status=${v}`;
          return (
            <Link
              key={v}
              href={href}
              aria-current={active ? "true" : undefined}
              className={`mono rounded-pill px-3 py-1.5 transition-colors duration-hover ${
                active
                  ? "bg-[var(--color-violet-100)] !text-[var(--color-violet-700)]"
                  : "border border-[var(--color-border-default)] hover:bg-[var(--color-surface-page-alt)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <ImpactReportsManager
        reports={(rows.data ?? []) as unknown as Report[]}
        chapters={chapters}
        people={people}
        myId={profile.id}
        canVerify={rank(profile) >= 50}
        canVerifyOwn={rank(profile) >= 60}
        canFile={canEdit(profile, "impactReports")}
        canDelete={canRemove(profile, "impactReports")}
        defaultChapter={profile.chapter_id ?? null}
      />
    </div>
  );
}

function Total({ n, label, tone }: { n: number; label: string; tone: "success" | "warning" }) {
  const bg =
    tone === "success"
      ? "var(--color-feedback-success-surface)"
      : "var(--color-feedback-warning-surface)";
  const fg =
    tone === "success"
      ? "var(--color-feedback-success-text)"
      : "var(--color-feedback-warning-text)";

  return (
    <span className="rounded-dash-sm px-4 py-3" style={{ background: bg, color: fg }}>
      <strong className="text-[18px] font-semibold">{n.toLocaleString()}</strong>{" "}
      <span className="text-[13px] opacity-90">{label}</span>
    </span>
  );
}
