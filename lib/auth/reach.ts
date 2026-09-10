import { createClient } from "@/lib/supabase/server";
import { rank, type Profile } from "./permissions";

/**
 * How far someone's view of the organisation extends.
 *
 * This is the application-side twin of `can_reach_chapter()` in migration 013.
 * The database is the boundary — a campus coordinator asking for another
 * chapter's events gets nothing back whatever this file says. What this gives
 * the interface is the ability to be *honest* about the boundary: to fill the
 * chapter filter with the chapters a person can actually reach, and to write
 * "Events across the South East zone" at the top of the page rather than a
 * generic heading that leaves them guessing what they are looking at.
 *
 * Keep it in step with 013. Where they disagree, the database wins and the
 * person sees an error they cannot act on — which is the worst outcome, not
 * because it is unsafe but because it is baffling.
 */

export type ChapterOpt = { id: string; name: string };

/** Who may put a chapter's work on the main AAC site. */
export function canFeature(p: Profile | null | undefined): boolean {
  if (!p || p.status !== "active") return false;
  return ["super_admin", "admin", "department_director", "content_lead"].includes(p.role);
}

/** True when this person sees the whole organisation. */
export function seesEverything(p: Profile | null | undefined): boolean {
  if (!p || p.status !== "active") return false;
  return ["super_admin", "admin", "department_director", "board_member", "content_lead"].includes(
    p.role
  );
}

/**
 * The chapters this person can act on, named for a menu.
 *
 * Returns [] for someone who reaches nothing, and every chapter for admins,
 * directors, board members and content leads.
 */
export async function reachableChapters(p: Profile | null | undefined): Promise<ChapterOpt[]> {
  if (!p || p.status !== "active") return [];

  const db = await createClient();
  if (!db) return [];

  try {
    let q = db.from("chapters").select("id,name,university,zone_id,region_id").order("name").limit(500);

    if (!seesEverything(p)) {
      if (p.role === "regional_coordinator") {
        if (!p.region_id) return [];
        q = q.eq("region_id", p.region_id);
      } else if (p.role === "zonal_coordinator") {
        const zone = (p as Profile & { zone_id?: string | null }).zone_id;
        if (!zone) return [];
        q = q.eq("zone_id", zone);
      } else if (rank(p) >= 35) {
        if (!p.chapter_id) return [];
        q = q.eq("id", p.chapter_id);
      } else {
        return [];
      }
    }

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((c: any) => ({ id: c.id, name: c.name || c.university }));
  } catch {
    return [];
  }
}

/**
 * Narrow a dashboard query to what this person's remit covers.
 *
 * SUBTLE AND IMPORTANT. RLS is not enough on its own here, and it is worth
 * being precise about why. Published content is readable by anyone, signed in
 * or not — it is on the public internet — so the `pub_events` policy grants
 * every authenticated user a SELECT on every published row. RLS therefore
 * stops a campus coordinator from *editing* another chapter's work, and from
 * seeing its drafts, but not from seeing its published entries in a list.
 *
 * That is correct as a security rule and wrong as an interface: a coordinator
 * opening Events wants their campus, not four hundred rows from forty
 * campuses. So the narrowing that makes the dashboard usable happens here, in
 * the query, and the narrowing that makes it safe stays in the database. Two
 * mechanisms, two different jobs — do not collapse them.
 */
export function applyReach<T>(query: T, p: Profile | null | undefined, chapters: ChapterOpt[]): T {
  if (seesEverything(p)) return query;

  const q = query as any;
  if (!p || chapters.length === 0) {
    /* Reaches nothing. An impossible filter is the honest answer — better an
       empty list than someone else's work. */
    return q.eq("chapter_id", "00000000-0000-0000-0000-000000000000");
  }

  return q.in(
    "chapter_id",
    chapters.map((c) => c.id)
  );
}

/**
 * One sentence saying whose work this screen is showing.
 *
 * Written per role rather than per rank, because "you see your zone" and "you
 * see everything, and you decide what reaches the main site" are different
 * facts about someone's job, not different numbers.
 */
export function describeReach(p: Profile | null | undefined, noun: "event" | "article" | "programme"): string {
  const plural = noun === "event" ? "Events" : noun === "article" ? "Articles" : "Programmes";
  const thing = noun === "event" ? "event" : noun === "article" ? "article" : "programme";

  if (!p) return `${plural}.`;

  if (canFeature(p)) {
    return `Every ${thing} across AAC and every chapter. You choose which of them appear on the main AAC website.`;
  }
  if (p.role === "board_member") {
    return `Every ${thing} across AAC and every chapter, to read.`;
  }
  if (p.role === "regional_coordinator") {
    return `${plural} from the chapters in your region.`;
  }
  if (p.role === "zonal_coordinator") {
    return `${plural} from the chapters in your zone.`;
  }
  if (p.role === "campus_coordinator") {
    return `Your chapter's ${plural.toLowerCase()}. Anything published here appears on your chapter's own website; an admin decides whether it also appears on the main AAC site.`;
  }
  return `${plural} for your chapter. Anything you create goes to a coordinator for review before it appears on the site.`;
}
