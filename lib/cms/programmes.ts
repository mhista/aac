"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canEdit, canRemove } from "@/lib/auth/capabilities";
import { canPublish } from "@/lib/auth/permissions";
import { getSession, NOT_SIGNED_IN, formReader, type ActionResult, slugify, uniqueSlug } from "@/lib/cms/shared";

/**
 * Programmes.
 *
 * A programme is the standing work — the thing that runs for months and that
 * events belong to. An event says "we screened 300 people in Enugu in March";
 * a programme says "this is what our screening work is".
 *
 * They are national by default and editable by directors, admins and content
 * leads, because a programme page is the organisation speaking. Migration 013
 * gave them a `chapter_id` as well, so a chapter can run its own — and when it
 * does, the same reach rule that governs events governs this.
 */

type Result = ActionResult;

export async function createProgrammeAndOpen(): Promise<void> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me || !canEdit(me, "programmes")) {
    redirect(`/dashboard/programmes?error=${encodeURIComponent("Your role does not allow creating programmes.")}`);
  }

  /* A unique placeholder slug, so two people creating one at the same moment
     do not collide on "untitled". */
  const stamp = Date.now().toString(36);
  const { data, error } = await db
    .from("programmes")
    .insert({
      title: "Untitled programme",
      slug: `untitled-${stamp}`,
      status: "draft",
      chapter_id: me.chapter_id ?? null,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/dashboard/programmes?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/dashboard/programmes/${data.id}`);
}

export async function saveProgramme(id: string, form: FormData): Promise<Result> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canEdit(me, "programmes")) return { ok: false, error: "Your role does not allow editing programmes." };

  const { str, num } = formReader(form);

  const title = str("title") ?? "Untitled programme";
  const slug = await uniqueSlug(
    db,
    "programmes",
    slugify(str("slug") ?? title, { foldAccents: true, fallback: "programme" }),
    { ignoreId: id, attempts: 58 }
  );

  /* Locations are typed as a comma-separated line, because asking someone to
     manage a repeating field for "Enugu, Nsukka, Awka" is more interface than
     the problem deserves. */
  const locations = (str("locations") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await db
    .from("programmes")
    .update({
      title,
      slug,
      subtitle: str("subtitle"),
      excerpt: str("excerpt"),
      body: str("body"),
      pillar: str("pillar"),
      status_label: str("status_label"),
      target_reach: num("target_reach"),
      actual_reach: num("actual_reach"),
      start_date: str("start_date"),
      end_date: str("end_date"),
      locations,
      updated_by: me.id,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/programmes");
  revalidatePath("/programmes");
  revalidatePath(`/programmes/${slug}`);
  return { ok: true, message: "Saved." };
}

export async function setProgrammeStatus(id: string, status: string): Promise<Result> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canEdit(me, "programmes")) return { ok: false, error: "Your role does not allow this." };

  const allowed = ["draft", "in_review", "changes_requested", "published", "archived"];
  if (!allowed.includes(status)) return { ok: false, error: "Unknown status." };

  if (status === "published") {
    if (!canPublish(me)) {
      return { ok: false, error: "Publishing needs a coordinator or above. Send it for review instead." };
    }
    /* A programme page with no summary is a heading and a blank space. */
    const { data } = await db.from("programmes").select("title,excerpt").eq("id", id).maybeSingle();
    if (!data?.excerpt) {
      return { ok: false, error: "Add the short summary before publishing — it is what shows on the programmes list." };
    }
    if (!data.title || data.title === "Untitled programme") {
      return { ok: false, error: "Give it a real title before publishing." };
    }
  }

  const patch: Record<string, unknown> = { status, updated_by: me.id };
  if (status === "published") patch.published_at = new Date().toISOString();

  const { error } = await db.from("programmes").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/programmes");
  revalidatePath("/programmes");
  return {
    ok: true,
    message:
      status === "published" ? "Published — it is live on the site."
      : status === "in_review" ? "Sent for review."
      : status === "archived" ? "Archived and taken off the site."
      : "Saved as a draft.",
  };
}

export async function deleteProgramme(id: string): Promise<Result> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;

  const { data } = await db.from("programmes").select("title,status,created_by").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "That programme no longer exists." };

  const live = data.status === "published";
  const mine = data.created_by === me.id;
  if (!canRemove(me, "programmes") && !(mine && !live)) {
    return {
      ok: false,
      error: live
        ? "Only an admin can delete a published programme. Archive it instead — that takes it off the site and keeps its history."
        : "You can only delete a programme you created and have not published.",
    };
  }

  const { error } = await db.from("programmes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/programmes");
  revalidatePath("/programmes");
  return { ok: true, message: "Programme deleted." };
}

export async function deleteManyProgrammes(ids: string[]): Promise<Result> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canRemove(me, "programmes")) return { ok: false, error: "Only an admin can delete programmes in bulk." };
  if (ids.length === 0) return { ok: false, error: "Nothing was selected." };

  const { error } = await db.from("programmes").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/programmes");
  revalidatePath("/programmes");
  return { ok: true, message: `${ids.length} programme${ids.length === 1 ? "" : "s"} deleted.` };
}
