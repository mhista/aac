"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canEdit, canRemove } from "@/lib/auth/capabilities";

/**
 * Team server actions.
 *
 * Leadership is the page outsiders judge an organisation by, so two rules are
 * enforced here rather than left to whoever is typing:
 *
 *  · A photograph cannot be attached without alt text. The name is offered as
 *    the default, because "Boma Mary Dapper" is a better description of a
 *    portrait than most people would write unprompted.
 *  · Publishing needs a name and a role. A card reading "Untitled" on the
 *    About page is worse than no card.
 */

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

export async function createTeamMember(): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (!canEdit(profile, "team")) {
    return { ok: false, error: "Editing the board and directors is limited to department directors and admins." };
  }

  /* Straight to the top, not the bottom. The person you just created is the
     one you are about to fill in — burying them under ten existing board
     members means scrolling past everyone to find a row called "New person".
     Ordering is editable afterwards, so this costs nothing. */
  const { data: first } = await db
    .from("team_members")
    .select("position")
    .order("position")
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("team_members")
    .insert({
      full_name: "New person",
      tier: "board",
      position: (first?.position ?? 1) - 1,
      is_published: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  return { ok: true, id: data.id as string, message: "Added at the top. Fill in their details, then publish." };
}

export async function saveTeamMember(id: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (!canEdit(profile, "team")) {
    return { ok: false, error: "Editing the board and directors is limited to department directors and admins." };
  }

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
    tier: str("tier") ?? "board",
    position: Number(str("position") ?? "0") || 0,
    photo: photoUrl
      ? { url: photoUrl, alt: photoAlt, width: 900, height: 1125 }
      : null,
  };

  const { error } = await db.from("team_members").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  revalidatePath("/about");
  revalidatePath("/departments", "layout");
  return { ok: true, message: `Saved ${fullName}.` };
}

export async function setTeamPublished(id: string, next: boolean): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (!canEdit(profile, "team")) {
    return { ok: false, error: "Editing the board and directors is limited to department directors and admins." };
  }

  if (next) {
    const { data } = await db
      .from("team_members")
      .select("full_name,role_title")
      .eq("id", id)
      .single();
    if (!data?.full_name || data.full_name === "New person") {
      return { ok: false, error: "Give this person their real name before publishing." };
    }
    if (!data.role_title) {
      return { ok: false, error: "Add their role before publishing — a card with no role tells nobody anything." };
    }
  }

  const { error } = await db.from("team_members").update({ is_published: next }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  revalidatePath("/about");
  return { ok: true, message: next ? "Published to the website." : "Hidden from the website." };
}

export async function deleteTeamMember(id: string): Promise<Result> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (!canRemove(profile, "team")) return { ok: false, error: "Only an admin can remove someone." };

  const { error } = await db.from("team_members").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  revalidatePath("/about");
  return { ok: true, message: "Removed." };
}
