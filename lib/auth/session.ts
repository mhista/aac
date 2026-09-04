import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./permissions";

/**
 * The signed-in profile, or null.
 *
 * Wrapped in React `cache` so a layout, a page and a component in the same
 * request share one round trip rather than three.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const db = await createClient();
  if (!db) return null;

  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const { data } = await db
    .from("profiles")
    .select("id,full_name,email,avatar_url,role,chapter_id,region_id,department_id,status")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
});
