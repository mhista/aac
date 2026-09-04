import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { ImpactMetrics } from "@/components/dashboard/ImpactMetrics";

export const dynamic = "force-dynamic";

/**
 * Impact figures.
 *
 * Unpublished figures are listed alongside live ones rather than hidden. The
 * "not yet measured" state — people reached, drug access support — is a real
 * position the organisation has taken, and it should be visible to whoever is
 * deciding whether it can be filled in yet.
 */
export default async function ImpactPage() {
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "impactMetrics")) {
    return (
      <div className="mx-auto max-w-[1000px]">
        <PageHeader title="Impact figures" />
        <EmptyPanel title="Not available to your role" body={refusalFor("impactMetrics")} />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const { data } = await db
    .from("impact_metrics")
    .select("id,key,label,value_numeric,value_display,unit,as_of,is_headline,position,methodology_note,is_published")
    .order("position");

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Impact figures"
        description="The numbers shown on the homepage and the impact page. These get quoted in funding applications and by people who were not there when they were counted — so every published figure carries a note saying how."
      />
      <ImpactMetrics
        metrics={(data ?? []) as any[]}
        canEdit={canEdit(profile, "impactMetrics")}
        canDelete={canRemove(profile, "impactMetrics")}
      />
    </div>
  );
}
