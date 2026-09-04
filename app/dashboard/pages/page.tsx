import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { getEvents, getPosts, getImpactMetrics, getChapters } from "@/lib/cms";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { PageSections } from "@/components/dashboard/PageSections";

export const dynamic = "force-dynamic";

/**
 * Page composition.
 *
 * Each section is shown with what it would actually put on the page right
 * now — "4 events", "nothing to show yet". That is the number that decides
 * whether it should be on, and having to open the live site in another tab to
 * find it out would make this screen a guessing game.
 */
export default async function PagesScreen() {
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "pages")) {
    return (
      <div className="mx-auto max-w-[900px]">
        <PageHeader title="Pages" />
        <EmptyPanel title="Not available to your role" body={refusalFor("pages")} />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const { data: page } = await db.from("pages").select("id,slug,title").eq("slug", "home").single();

  if (!page) {
    return (
      <div className="mx-auto max-w-[900px]">
        <PageHeader title="Pages" />
        <EmptyPanel
          title="The homepage registry is missing"
          body="Migration 003 creates the list of homepage sections. Until it has run, the site shows every section and there is nothing to switch here."
        />
      </div>
    );
  }

  const [{ data: sections }, events, posts, metrics, chapters] = await Promise.all([
    db
      .from("page_sections")
      .select("id,type,position,is_visible")
      .eq("page_id", page.id)
      .order("position"),
    getEvents({ limit: 4 }),
    getPosts({ limit: 3 }),
    getImpactMetrics(),
    getChapters(),
  ]);

  /* What each section would actually render today. */
  const published = metrics.filter((m) => m.value_display);
  const counts: Record<string, string> = {
    hero: "Always shown",
    statement: "Fixed copy",
    pillarCards: "The six pillars",
    impactStats: published.length
      ? `${published.length} figure${published.length === 1 ? "" : "s"}`
      : "No figures published yet",
    featuredEvents: events.length
      ? `${events.length} event${events.length === 1 ? "" : "s"}`
      : "Nothing to show yet",
    countryReach: chapters.length
      ? `${chapters.length} chapter${chapters.length === 1 ? "" : "s"}`
      : "No chapters live yet",
    values: "Fixed copy",
    latestPosts: posts.length
      ? `${posts.length} article${posts.length === 1 ? "" : "s"}`
      : "Nothing to show yet",
    getInvolved: "Fixed copy",
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title="Homepage"
        description="What appears on the front page, and in what order. Switching a section off removes it from the live site — useful while a part of the organisation has nothing to show yet."
      />
      <PageSections
        sections={(sections ?? []) as any[]}
        counts={counts}
        canEdit={canEdit(profile, "pages")}
      />
    </div>
  );
}
