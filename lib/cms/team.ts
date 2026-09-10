"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canEdit, canRemove } from "@/lib/auth/capabilities";
import { rank, type Profile } from "@/lib/auth/permissions";
import { seesEverything } from "@/lib/auth/reach";

/**
 * People — the national board and directors, and each chapter's executives.
 *
 * One table and one set of actions for both, because they are the same object:
 * a name, a role, a portrait, an order. What separates them is `chapter_id`,
 * and that single column also decides who may edit the row:
 *
 *   chapter_id IS NULL  →  governance. Directors and admins only.
 *   chapter_id = X      →  X's executives. X's coordinator, and anyone above.
 *
 * That distinction is the fix for the hole 009 closed from the other side: a
 * campus coordinator could once edit the national board. Now they can edit
 * their own committee and nothing else, which is what they actually needed.
 *
 * Two rules are enforced here rather than left to whoever is typing:
 *
 *  · A photograph cannot be attached without alt text. The name is offered as
 *    the default, because "Boma Mary Dapper" is a better description of a
 *    portrait than most people would write unprompted.
 *  · Publishing needs a name and a role. A card reading "Untitled" on the
 *    About page is worse than no card.
 */

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

/** Whether this person may edit people belonging to `chapterId` (null = AAC). */
function mayEditPeople(me: Profile, chapterId: string | null): boolean {
  if (chapterId === null) return canEdit(me, "team");
  if (seesEverything(me)) return true;
  if (rank(me) >= 60) return true; /* regional and above — RLS narrows to their region */
  return rank(me) >= 50 && me.chapter_id === chapterId;
}

function refusal(chapterId: string | null): string {
  return chapterId === null
    ? "Editing the board and directors is limited to department directors and admins."
    : "You can only edit the executives of your own chapter.";
}

async function chapterOf(db: any, id: string): Promise<string | null | undefined> {
  const { data } = await db.from("team_members").select("chapter_id").eq("id", id).maybeSingle();
  return data ? ((data.chapter_id as string | null) ?? null) : undefined;
}

export async function createTeamMember(chapterId?: string | null): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };

  const chapter = chapterId ?? null;
  if (!mayEditPeople(profile, chapter)) return { ok: false, error: refusal(chapter) };

  /* Straight to the top, not the bottom. The person you just created is the
     one you are about to fill in — burying them under ten existing board
     members means scrolling past everyone to find a row called "New person".
     Ordering is editable afterwards, so this costs nothing.

     Scoped to the same list they will appear in, so adding a campus executive
     does not push them above the national board. */
  let posQuery = db.from("team_members").select("position").order("position").limit(1);
  posQuery = chapter ? posQuery.eq("chapter_id", chapter) : posQuery.is("chapter_id", null);
  const { data: first } = await posQuery.maybeSingle();

  const { data, error } = await db
    .from("team_members")
    .insert({
      /* Unique per chapter, so two chapters can each have a blank row waiting
         to be filled in without colliding. */
      full_name: chapter ? `New person ${Date.now().toString(36).slice(-4)}` : "New person",
      tier: chapter ? "executive" : "board",
      chapter_id: chapter,
      position: (first?.position ?? 1) - 1,
      is_published: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(chapter ? "/dashboard/executives" : "/dashboard/team");
  return { ok: true, id: data.id as string, message: "Added at the top. Fill in their details, then publish." };
}

export async function saveTeamMember(id: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };

  const chapter = await chapterOf(db, id);
  if (chapter === undefined) return { ok: false, error: "That person could not be found." };
  if (!mayEditPeople(profile, chapter)) return { ok: false, error: refusal(chapter) };

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const fullName = str("full_name");
  if (!fullName) return { ok: false, error: "A person needs a name." };

  const photoUrl = str("photo_url");
  const photoAlt = str("photo_alt") ?? fullName;

  const patch: Record<string, unknown> = {
    full_name: fullName,
    role_title: str("role_title"),
    bio: str("bio"),
    linkedin: str("linkedin"),
    tier: str("tier") ?? (chapter ? "executive" : "board"),
    position: Number(str("position") ?? "0") || 0,
    photo: photoUrl
      ? { url: photoUrl, alt: photoAlt, width: 900, height: 1125 }
      : null,
  };

  const { error } = await db.from("team_members").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `${fullName} is already listed here.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(chapter ? "/dashboard/executives" : "/dashboard/team");
  revalidatePath("/about");
  revalidatePath("/departments", "layout");
  revalidatePath("/");
  return { ok: true, message: `Saved ${fullName}.` };
}

export async function setTeamPublished(id: string, next: boolean): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };

  const chapter = await chapterOf(db, id);
  if (chapter === undefined) return { ok: false, error: "That person could not be found." };
  if (!mayEditPeople(profile, chapter)) return { ok: false, error: refusal(chapter) };

  if (next) {
    const { data } = await db
      .from("team_members")
      .select("full_name,role_title")
      .eq("id", id)
      .single();
    if (!data?.full_name || data.full_name.startsWith("New person")) {
      return { ok: false, error: "Give this person their real name before publishing." };
    }
    if (!data.role_title) {
      return { ok: false, error: "Add their role before publishing — a card with no role tells nobody anything." };
    }
  }

  const { error } = await db.from("team_members").update({ is_published: next }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(chapter ? "/dashboard/executives" : "/dashboard/team");
  revalidatePath("/about");
  revalidatePath("/");
  return { ok: true, message: next ? "Published to the website." : "Hidden from the website." };
}

export async function deleteTeamMember(id: string): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };

  const chapter = await chapterOf(db, id);
  if (chapter === undefined) return { ok: false, error: "That person could not be found." };

  /* Removing a board member is an admin act; removing a campus executive is
     the coordinator's own housekeeping. */
  const allowed = chapter === null ? canRemove(profile, "team") : mayEditPeople(profile, chapter);
  if (!allowed) {
    return {
      ok: false,
      error: chapter === null ? "Only an admin can remove someone." : refusal(chapter),
    };
  }

  const { error } = await db.from("team_members").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(chapter ? "/dashboard/executives" : "/dashboard/team");
  revalidatePath("/about");
  revalidatePath("/");
  return { ok: true, message: "Removed." };
}
