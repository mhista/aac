"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canEdit } from "@/lib/auth/capabilities";

/**
 * Page composition.
 *
 * The original brief asked for this first: sections that can be switched off
 * from the CMS, so a part of the site with nothing behind it yet does not sit
 * there half-empty. It is the other half of the no-demo-data rule — sections
 * render an honest empty state, and this is how you decide whether they render
 * at all.
 *
 * Sections are reordered by swapping positions with the neighbour rather than
 * by drag and drop. Two reasons: it works on a phone and with a keyboard,
 * which drag and drop does not, and there are nine of them — the ceremony of a
 * drag library would cost more than it returns.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function setSectionVisible(id: string, visible: boolean): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canEdit(me, "pages")) {
    return { ok: false, error: "Changing what appears on the site is limited to directors, admins and content leads." };
  }

  const { error } = await db
    .from("page_sections")
    .update({ is_visible: visible })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/dashboard/pages");
  return {
    ok: true,
    message: visible ? "Section is back on the page." : "Section is hidden from the page.",
  };
}

/** Swap a section with the one above or below it. */
export async function moveSection(id: string, direction: "up" | "down"): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canEdit(me, "pages")) return { ok: false, error: "Your role does not allow this." };

  const { data: row } = await db
    .from("page_sections")
    .select("id,page_id,position")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, error: "That section no longer exists." };

  /* The immediate neighbour in the chosen direction. Positions are not
     guaranteed contiguous, so this asks the database for the nearest rather
     than assuming position ± 1. */
  const { data: neighbours } = await db
    .from("page_sections")
    .select("id,position")
    .eq("page_id", row.page_id)
    [direction === "up" ? "lt" : "gt"]("position", row.position)
    .order("position", { ascending: direction !== "up" })
    .limit(1);

  const other = neighbours?.[0];
  if (!other) return { ok: true, message: "It is already at the end." };

  /* Two updates rather than one statement: PostgREST has no atomic swap, and
     a temporary duplicate position is harmless because nothing is unique on
     it — the order simply resolves on the second write. */
  await db.from("page_sections").update({ position: other.position }).eq("id", row.id);
  await db.from("page_sections").update({ position: row.position }).eq("id", other.id);

  revalidatePath("/");
  revalidatePath("/dashboard/pages");
  return { ok: true };
}
