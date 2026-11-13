import { getProfile } from "@/lib/auth/session";
import { canRead } from "@/lib/auth/capabilities";
import { getInsights } from "@/lib/insights";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { NoAccess } from "@/components/dashboard/NoAccess";
import { InsightsView } from "@/components/dashboard/insights/InsightsView";

export const dynamic = "force-dynamic";

/**
 * Insights — how the work is going, at whatever level you lead.
 *
 * See lib/insights.ts for who sees what and what is counted. This page only
 * lays it out: headline numbers with their change, a small chart per measure,
 * a breakdown one level down the hierarchy (regions → zones → chapters), the
 * work in progress, and what changed most recently.
 */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; period?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) return null;
  if (!canRead(profile, "insights")) return <NoAccess profile={profile} />;

  const sp = await searchParams;
  const data = await getInsights(profile, sp);

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Insights" />
        <EmptyPanel title="No data connection" body="The database is not reachable from this environment yet. Once Supabase is configured the figures fill in on their own." />
      </div>
    );
  }
  if (!data.reachable) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Insights" />
        <EmptyPanel
          title="Your account is not attached to a chapter, zone or region yet"
          body="Insights shows the work in the part of AAC you lead. Ask an admin to set your chapter, zone or region under Users & roles."
        />
      </div>
    );
  }

  return <InsightsView data={data} />;
}
