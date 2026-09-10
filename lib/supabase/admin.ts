import { createClient as createSupabase } from "@supabase/supabase-js";

/**
 * The service-role client. Bypasses row-level security entirely.
 *
 * ONLY EVER IMPORT THIS FROM SERVER CODE — a `"use server"` module or a route
 * handler. It holds a key that can read and write every row in the database
 * regardless of who is asking, so importing it into a component that ships to
 * the browser would put that key in the page source.
 *
 * It exists for exactly one job here: writing a CV into a private storage
 * bucket that has no policies at all, and minting the short-lived links that
 * read one back. The bucket is deliberately closed to every ordinary client;
 * this is the only door, and the caller checks the person's reach before
 * knocking on it.
 *
 * Returns null rather than throwing when the key is absent, so a deployment
 * without it degrades to "CV uploads are unavailable" instead of a crash.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Whether this deployment can accept CV uploads at all. */
export function storageConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
