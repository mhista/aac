import { getProfile } from "@/lib/auth/session";
import { canRead, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { UsersManager } from "@/components/dashboard/UsersManager";

export const dynamic = "force-dynamic";

/**
 * Users & roles.
 *
 * The screen that decides who can do anything. Two things are deliberate:
 *
 * · Scope pickers (chapter, region, department) are loaded here rather than
 *   fetched in the browser, so a campus coordinator's chapter is chosen from
 *   the real list instead of typed.
 * · Pending invitations sit beside real accounts. An invitation nobody acted
 *   on looks identical to an account that does not exist, and that is exactly
 *   the confusion that has an admin invite the same person three times.
 */
export default async function UsersPage() {
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "users")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Users & roles" />
        <EmptyPanel
          title="Not available to your role"
          body={refusalFor("users")}
        />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const [people, invites, chapters, zones, regions, departments] = await Promise.all([
    db.from("profiles")
      .select("id,full_name,email,role,status,chapter_id,zone_id,region_id,department_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("invitations")
      .select("id,email,full_name,role,created_at,expires_at,accepted_at,revoked_at")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    /* university + city, not `name` — a chapter created and not yet filled in
       is literally called "New chapter", which is useless in a dropdown. */
    db.from("chapters")
      .select("id,name,university,city,country,status")
      .not("status", "eq", "closed")
      .order("country")
      .order("university"),
    db.from("zones").select("id,name,country").order("position"),
    db.from("regions").select("id,name").order("name"),
    db.from("departments").select("id,name").order("name"),
  ]);

  /* Who currently holds each chapter. One campus coordinator per chapter is
     the rule (009 enforces it as a unique index), so the picker has to show
     which are already taken rather than letting someone pick a clash and
     discover it on save. */
  const held: Record<string, string> = {};
  for (const p of people.data ?? []) {
    const row = p as any;
    if (row.role === "campus_coordinator" && row.chapter_id && row.status === "active") {
      held[row.chapter_id] = row.full_name ?? row.email ?? "someone";
    }
  }

  const chapterOptions = (chapters.data ?? []).map((c: any) => ({
    id: c.id,
    name: [c.university, c.city].filter(Boolean).join(" · ") || c.name,
    country: c.country,
    heldBy: held[c.id] ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Users & roles"
        description="Who can sign in, and what each of them may do. Roles are given by an admin — nobody can request or raise their own."
      />
      <UsersManager
        me={profile}
        people={(people.data ?? []) as any[]}
        invites={(invites.data ?? []) as any[]}
        chapters={chapterOptions}
        zones={(zones.data ?? []) as any[]}
        regions={(regions.data ?? []) as any[]}
        departments={(departments.data ?? []) as any[]}
      />
    </div>
  );
}
