import { getProfile } from "@/lib/auth/session";
import { canRead, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { AuditLog } from "@/components/dashboard/AuditLog";

export const dynamic = "force-dynamic";

/**
 * The audit log.
 *
 * Actors are joined in a second query rather than with a foreign-key embed.
 * PostgREST embeds fail as a whole when RLS hides any related row, which would
 * mean one unreadable profile blanking the entire log — the opposite of what a
 * log is for. Two queries and a lookup table cannot do that.
 */
export default async function AuditPage() {
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "audit")) {
    return (
      <div className="mx-auto max-w-[1000px]">
        <PageHeader title="Audit log" />
        <EmptyPanel title="Not available to your role" body={refusalFor("audit")} />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const { data: rows } = await db
    .from("audit_log")
    .select("id,action,entity_type,entity_id,diff,created_at,actor_id")
    .order("created_at", { ascending: false })
    .limit(500);

  const actorIds = Array.from(
    new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean))
  );

  const { data: actors } = actorIds.length
    ? await db.from("profiles").select("id,full_name,email,role").in("id", actorIds)
    : { data: [] };

  const byId = new Map((actors ?? []).map((a: any) => [a.id, a]));

  const entries = (rows ?? []).map((r: any) => ({
    id: r.id,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    diff: r.diff,
    created_at: r.created_at,
    actor: byId.get(r.actor_id) ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Audit log"
        description="Who changed what, and when. Everything that publishes, deletes, or changes someone's access is recorded here as it happens."
      />
      <AuditLog entries={entries as any[]} />
    </div>
  );
}
