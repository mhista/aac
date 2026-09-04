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
    /* `*`, not a column list. A migration that has not been run yet must never
       be able to break sign-in: naming a column that does not exist makes the
       whole query fail, getProfile returns null, the dashboard bounces to
       /login, middleware sees a valid session and bounces back — an infinite
       redirect. Selecting everything means a missing column is simply absent
       from the object, which the code already handles. */
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
});
