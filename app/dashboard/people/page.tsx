import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { rank } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { reachableChapters, seesEverything } from "@/lib/auth/reach";
import { PageHeader, EmptyPanel, Notice } from "@/components/dashboard/ui";
import { AdvocatesManager, type Advocate } from "@/components/dashboard/AdvocatesManager";
import { AdvocateFilters } from "@/components/dashboard/AdvocateFilters";
import { AdvocateImport } from "@/components/dashboard/AdvocateImport";

export const dynamic = "force-dynamic";

const PAGE = 100;

/**
 * Advocates.
 *
 * The list of everyone who has signed up, from the website form and from the
 * two Google Forms that ran before it existed.
 *
 * Two counts are shown at the top and they answer different questions:
 * how many people there are, and how many nobody has looked at yet. The second
 * is the one that goes wrong — a form that collects eight hundred people and
 * replies to none of them is worse than no form.
 */
export default async function AdvocatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; kind?: string; country?: string;
    chapter?: string; interest?: string; q?: string; page?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const kind = sp.kind ?? "all";
  const country = sp.country ?? "all";
  const chapter = sp.chapter ?? "all";
  const interest = sp.interest ?? "all";
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "advocates")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Advocates" />
        <EmptyPanel title="Not available to your role" body={refusalFor("advocates")} />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const chapters = await reachableChapters(profile);
  const isAdmin = rank(profile) >= 80;

  const SELECT =
    "id,first_name,last_name,email,phone,gender,age_range,country,locality,chapter_id," +
    "profile_kind,interests,involvement,motivation,school,faculty,study_level," +
    "professional_title,workplace,years_experience,occupation,source,status,notes,submitted_at";

  /* One builder, used for the page of rows and for the counts, so a filter can
     never apply to one and not the other. */
  const build = (select: string, head = false) => {
    let x = db.from("advocates").select(select, head ? { count: "exact", head: true } : undefined);

    if (status !== "all") x = x.eq("status", status);
    if (kind !== "all") x = x.eq("profile_kind", kind);
    if (country !== "all") x = x.eq("country", country);
    if (interest !== "all") x = x.contains("interests", [interest]);
    if (chapter === "none") x = x.is("chapter_id", null);
    else if (chapter !== "all") x = x.eq("chapter_id", chapter);

    if (q.trim()) {
      const n = q.trim().replace(/[%,()]/g, "");
      x = x.or(
        `first_name.ilike.%${n}%,last_name.ilike.%${n}%,email.ilike.%${n}%,school.ilike.%${n}%,locality.ilike.%${n}%`
      );
    }
    return x;
  };

  const [rows, filteredCount, totalCount, newCount] = await Promise.all([
    build(SELECT)
      .order("submitted_at", { ascending: false })
      .range((page - 1) * PAGE, page * PAGE - 1),
    build("id", true),
    db.from("advocates").select("id", { count: "exact", head: true }),
    db.from("advocates").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  /* The table only exists after migration 014. Until it has run, say so
     rather than showing an empty list that looks like nobody has signed up. */
  if (rows.error && /relation .* does not exist/i.test(rows.error.message)) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Advocates" />
        <EmptyPanel
          title="The advocates table has not been created yet"
          body="Run migration 014_advocates.sql in Supabase. Until then nobody can register, and the form at /join will not save anything."
        />
      </div>
    );
  }

  const advocates = (rows.data ?? []) as unknown as Advocate[];
  const shown = filteredCount.count ?? 0;
  const total = totalCount.count ?? 0;
  const unseen = newCount.count ?? 0;
  const pages = Math.max(1, Math.ceil(shown / PAGE));

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Advocates"
        description={
          seesEverything(profile)
            ? "Everyone who has signed up, across every country and chapter."
            : "The advocates attached to your part of the organisation. People not yet attached to a chapter are handled by regional coordinators and above."
        }
        action={isAdmin ? <AdvocateImport /> : null}
      />

      {total > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="rounded-dash-sm bg-[var(--color-surface-page-alt)] px-3 py-2 text-[13px]">
            <strong className="font-semibold">{total.toLocaleString()}</strong>{" "}
            <span className="text-[var(--color-text-secondary)]">registered</span>
          </span>
          {unseen > 0 && (
            <span
              className="rounded-dash-sm px-3 py-2 text-[13px]"
              style={{
                background: "var(--color-feedback-info-surface)",
                color: "var(--color-feedback-info-text)",
              }}
            >
              <strong className="font-semibold">{unseen.toLocaleString()}</strong> nobody has looked at yet
            </span>
          )}
        </div>
      )}

      {total === 0 && isAdmin && (
        <div className="mb-5">
          <Notice tone="info" title="Your existing advocates are still in Google Forms">
            Download each country&rsquo;s responses from Google Sheets as a CSV, then use
            <strong> Import from Google Forms</strong> above. Nothing is written until you have seen
            what it found, and running the same file twice updates people rather than duplicating
            them.
          </Notice>
        </div>
      )}

      <AdvocateFilters
        status={status} kind={kind} country={country} chapter={chapter}
        interest={interest} q={q} chapters={chapters}
        showChapters={chapters.length > 1 || seesEverything(profile)}
      />

      <AdvocatesManager
        advocates={advocates}
        chapters={chapters}
        canEdit={canEdit(profile, "advocates")}
        canDelete={canRemove(profile, "advocates")}
        total={total}
      />

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pages">
          <p className="mono">
            {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, shown)} of {shown.toLocaleString()}
          </p>
          <div className="flex gap-2">
            {page > 1 && <PageLink sp={sp} to={page - 1}>Previous</PageLink>}
            {page < pages && <PageLink sp={sp} to={page + 1}>Next</PageLink>}
          </div>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  sp, to, children,
}: {
  sp: Record<string, string | undefined>;
  to: number;
  children: React.ReactNode;
}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") p.set(k, v);
  }
  if (to > 1) p.set("page", String(to));
  const query = p.toString();

  return (
    <a
      href={query ? `/dashboard/people?${query}` : "/dashboard/people"}
      className="mono rounded-pill border border-[var(--color-border-default)] px-4 py-2 hover:bg-[var(--color-surface-page-alt)]"
    >
      {children}
    </a>
  );
}
