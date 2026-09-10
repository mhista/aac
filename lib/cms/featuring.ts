"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canFeature } from "@/lib/auth/reach";

/**
 * Choosing what a chapter has made that the whole organisation should see.
 *
 * This is the one place where the main AAC site borrows from a campus. It is
 * deliberately a flag on the original row rather than a copy: a featured event
 * edited by its chapter stays correct on aaci.ngo, and taking it off the main
 * site does not touch the chapter's own page.
 *
 * The database refuses this from anyone but an admin, a director or a content
 * lead (the trigger in migration 013). The check here exists so the interface
 * can say why, rather than showing a Postgres exception.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

type Kind = "events" | "posts" | "programmes";

const PUBLIC_PATH: Record<Kind, string> = {
  events: "/events",
  posts: "/blog",
  programmes: "/programmes",
};

const DASH_PATH: Record<Kind, string> = {
  events: "/dashboard/events",
  posts: "/dashboard/blog",
  programmes: "/dashboard/programmes",
};

export async function setFeatured(kind: Kind, id: string, on: boolean): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  if (!canFeature(me)) {
    return {
      ok: false,
      error: "Only an admin, a director or a content lead decides what appears on the main AAC website.",
    };
  }

  const { data: row, error: readErr } = await db
    .from(kind)
    .select("status,chapter_id")
    .eq("id", id)
    .maybeSingle();

  if (readErr || !row) return { ok: false, error: "That entry could not be found." };

  /* Featuring an unpublished entry would put a promise on the homepage that
     leads nowhere — the main site only ever queries published rows, so the
     flag would sit there doing nothing until somebody wondered why. */
  if (on && row.status !== "published") {
    return {
      ok: false,
      error: "Publish it first. Only published entries can appear on the main website.",
    };
  }

  const { error } = await db.from(kind).update({ is_featured: on }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: on ? "featured_on_main" : "unfeatured_from_main",
    entity_type: kind,
    entity_id: id,
  });

  revalidatePath(DASH_PATH[kind]);
  revalidatePath(PUBLIC_PATH[kind]);
  revalidatePath("/");

  return {
    ok: true,
    message: on
      ? "Now showing on the main AAC website."
      : "Removed from the main website. It stays on its own chapter's site.",
  };
}
