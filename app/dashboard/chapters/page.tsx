import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { ChaptersManager } from "@/components/dashboard/ChaptersManager";
import { ZonesPanel } from "@/components/dashboard/ZonesPanel";

export const dynamic = "force-dynamic";

/**
 * Chapters.
 *
 * Coordinator counts come from `profiles`, not from a field someone types.
 * A hand-maintained "coordinator: Ada" goes stale the moment Ada graduates,
 * and a chapter listed as active with nobody attached is exactly the kind of
 * thing this screen should surface rather than hide.
 */
export default async function ChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "chapters")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Chapters" />
        <EmptyPanel
          title="Not available to your role"
          body={refusalFor("chapters")}
        />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  let q = db
    .from("chapters")
    .select("id,name,university,city,country,region_id,zone_id,member_count,status,founded_at,created_at")
    .order("country")
    .order("university")
    .limit(500);

  if (status && status !== "all") q = q.eq("status", status);

  const [chapters, regions, staff, zoneRows, zoneStaff] = await Promise.all([
    q,
    db.from("regions").select("id,name").order("name"),
    db.from("profiles").select("id,full_name,email,role,chapter_id").not("chapter_id", "is", null),
    /* Zones only exist after migration 011. A missing table returns an error
       rather than throwing, so the rest of the page still renders and the
       panel explains what to run. */
    db.from("zones").select("id,name,country,covers,region_id").order("position"),
    db.from("profiles").select("full_name,email,role,zone_id").eq("role", "zonal_coordinator"),
  ]);

  const zonesAvailable = !zoneRows.error;

  /* Chapters per zone and who covers it, derived rather than stored. */
  const chaptersPerZone: Record<string, number> = {};
  for (const c of chapters.data ?? []) {
    const z = (c as any).zone_id;
    if (z) chaptersPerZone[z] = (chaptersPerZone[z] ?? 0) + 1;
  }
  const zoneCoordinator: Record<string, string> = {};
  for (const p of zoneStaff.data ?? []) {
    const row = p as any;
    if (row.zone_id) zoneCoordinator[row.zone_id] = row.full_name ?? row.email ?? "someone";
  }

  const zones = (zoneRows.data ?? []).map((z: any) => ({
    ...z,
    chapters: chaptersPerZone[z.id] ?? 0,
    coordinator: zoneCoordinator[z.id] ?? null,
  }));

  /* Who is attached to each chapter, derived rather than stored. */
  const byChapter: Record<string, { name: string; role: string }[]> = {};
  for (const p of staff.data ?? []) {
    const key = (p as any).chapter_id as string;
    (byChapter[key] ??= []).push({
      name: (p as any).full_name ?? (p as any).email ?? "Unnamed",
      role: (p as any).role,
    });
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Chapters"
        description="University chapters across every country. Only chapters marked live appear on the public site."
      />
      <div className="mb-5">
        <ZonesPanel
          zones={zones}
          regions={(regions.data ?? []) as any[]}
          canEdit={canEdit(profile, "chapters")}
          canDelete={canRemove(profile, "chapters")}
          available={zonesAvailable}
        />
      </div>

      <ChaptersManager
        chapters={(chapters.data ?? []) as any[]}
        regions={(regions.data ?? []) as any[]}
        zones={zones as any[]}
        people={byChapter}
        filter={status ?? "all"}
        canCreate={canEdit(profile, "chapters")}
        canDelete={canRemove(profile, "chapters")}
        canPublish={canEdit(profile, "chapters")}
      />
    </div>
  );
}
