"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Anon key only — every read and write still passes RLS.
 *
 * Returns null when the keys are absent, rather than asserting them with `!`
 * and letting `createBrowserClient` throw.
 *
 * That `!` cost us a production outage. `NEXT_PUBLIC_*` variables are inlined
 * at BUILD time, so a deploy built before they were added to Vercel ships
 * `undefined` no matter what the environment holds afterwards. The throw landed
 * inside an async submit handler as an unhandled rejection: the sign-in button
 * sat on "Working…" for ever, and the only sign of the real cause was a console
 * message no visitor would ever look at.
 *
 * Callers must handle null and say what is wrong. A tool that refuses clearly
 * is repairable; one that hangs is not.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

/**
 * Why the client could not be built, in words a person can act on.
 * Deliberately names the variables — whoever sees this is the one who can fix
 * it, and "contact support" would be advice to themselves.
 */
export const CONFIG_ERROR =
  "Sign-in is not configured on this deployment: NEXT_PUBLIC_SUPABASE_URL and " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY are missing from the build. Add them in the " +
  "hosting environment and redeploy — these are read when the site is built, " +
  "not when it runs, so a redeploy is required.";
