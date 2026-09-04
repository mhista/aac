"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";

/**
 * University chapters.
 *
 * A chapter is the unit everything else hangs off: a campus coordinator's
 * scope, an event's location, an advocate's home. So the CRM cannot be built
 * without it — Users & roles offers an empty chapter dropdown until rows
 * exist here.
 *
 * Only `active` chapters appear on the public site (RLS enforces that, not
 * this file). `pending` is the useful state: a chapter that has applied and is
 * being talked to, visible to staff, invisible to the world. Nothing about a
 * chapter reaches the public until someone deliberately makes it active.
 */

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

/* NOT exported. A "use server" module may only export async functions —
   anything else is a runtime error at import time, which TypeScript does not
   catch. `npm run check:server` does. */
const CHAPTER_STATUSES = ["pending", "active", "dormant", "closed"] as const;

export async function createChapter(): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 60) {
    return { ok: false, error: "Only a regional coordinator or above can add a chapter." };
  }

  /* `pending`, never `active`. A half-filled chapter must not appear on the
     public map because someone got distracted before finishing the form. */
  const { data, error } = await db
    .from("chapters")
    .insert({
      name: "New chapter",
      university: `Untitled ${Date.now().toString(36)}`,
      country: "Nigeria",
      status: "pending",
      region_id: me.region_id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/chapters");
  return { ok: true, id: data.id as string, message: "Added. Fill in the university and city." };
}

export async function saveChapter(id: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };
  const num = (k: string) => {
    const v = str(k);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const university = str("university");
  const country = str("country");
  if (!university) return { ok: false, error: "A chapter needs a university." };
  if (!country) return { ok: false, error: "A chapter needs a country." };

  const status = str("status") ?? "pending";
  if (!(CHAPTER_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Unknown status." };
  }

  /* Making a chapter public is a different act from editing one, and needs
     more than a campus coordinator editing their own row. */
  if (status === "active" && rank(me) < 60) {
    return {
      ok: false,
      error: "Only a regional coordinator or above can make a chapter live on the website.",
    };
  }

  const { error } = await db
    .from("chapters")
    .update({
      name: str("name") ?? university,
      university,
      city: str("city"),
      country,
      region_id: str("region_id"),
      zone_id: str("zone_id"),
      member_count: num("member_count"),
      founded_at: str("founded_at"),
      status,
    })
    .eq("id", id);

  if (error) {
    /* The table has unique (university, country). */
    if (error.code === "23505") {
      return { ok: false, error: `There is already a chapter at ${university} in ${country}.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/chapters");
  revalidatePath("/get-involved/chapters");
  return { ok: true, message: "Saved." };
}

export async function deleteChapter(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 80) return { ok: false, error: "Only an admin can delete a chapter." };

  /* People and events point at chapters. Deleting one out from under them
     leaves coordinators scoped to nothing and events with no home, so refuse
     and say what is attached. "Closed" is the honest end state for a chapter
     that has wound down — its history stays intact. */
  const [{ count: people }, { count: events }] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }).eq("chapter_id", id),
    db.from("events").select("*", { count: "exact", head: true }).eq("chapter_id", id),
  ]);

  if ((people ?? 0) > 0 || (events ?? 0) > 0) {
    const bits = [];
    if (people) bits.push(`${people} ${people === 1 ? "person" : "people"}`);
    if (events) bits.push(`${events} event${events === 1 ? "" : "s"}`);
    return {
      ok: false,
      error: `${bits.join(" and ")} still belong to this chapter. Mark it closed instead — that keeps its history and takes it off the website.`,
    };
  }

  const { error } = await db.from("chapters").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "chapter_deleted",
    entity_type: "chapters",
    entity_id: id,
  });

  revalidatePath("/dashboard/chapters");
  return { ok: true, message: "Chapter deleted." };
}
