/**
 * The plumbing every CMS server action shares.
 *
 * Deliberately NOT a "use server" module: it exports constants and plain
 * helpers, which a server-action file may not. The action files import from
 * here; nothing here is callable from the browser.
 *
 * Everything in this file was extracted from copies that used to live inside
 * each action module. Behaviour is unchanged — the copies were identical, and
 * where one differed (programme slugs) the difference is kept as an option
 * rather than smoothed away.
 */

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import type { Profile } from "@/lib/auth/permissions";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ── Results ───────────────────────────────────────────────────────── */

/**
 * What every server action returns. `id` and `message` are optional so one
 * type covers actions that create something, report something, or neither.
 */
export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

export const NOT_SIGNED_IN = { ok: false, error: "You are not signed in." } as const;

/* ── Session ───────────────────────────────────────────────────────── */

type Db = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/**
 * The database client and the signed-in profile, or null when either is
 * missing (Supabase not configured, or nobody signed in).
 *
 *   const session = await getSession();
 *   if (!session) return NOT_SIGNED_IN;
 *   const { db, me } = session;
 */
export async function getSession(): Promise<{ db: Db; me: Profile } | null> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return null;
  return { db, me };
}

/* ── Reading a submitted form ──────────────────────────────────────── */

/**
 * Typed readers over a FormData.
 *
 * `str` trims and turns an empty field into null — so "clear this field"
 * stores null rather than an empty string. `num` is null for anything that is
 * not a finite number. `ts` turns a datetime-local value into an ISO string.
 */
export function formReader(form: FormData) {
  const str = (k: string): string | null => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };
  const num = (k: string): number | null => {
    const v = str(k);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const ts = (k: string): string | null => {
    const v = str(k);
    return v ? new Date(v).toISOString() : null;
  };
  return { str, num, ts };
}

/* ── Slugs ─────────────────────────────────────────────────────────── */

/**
 * A URL slug from a title.
 *
 * Events and posts drop apostrophes ("Women's health" → "womens-health").
 * Programmes were written separately and instead fold accents and fall back
 * to "programme" — `{ foldAccents: true, fallback: "programme" }` keeps that
 * exactly, so no existing programme URL changes shape on its next save.
 */
export function slugify(
  s: string,
  opts: { foldAccents?: boolean; fallback?: string } = {}
): string {
  let out = s.toLowerCase();
  out = opts.foldAccents
    ? out.normalize("NFKD").replace(/[̀-ͯ]/g, "")
    : out.replace(/['’]/g, "");
  out = out
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return opts.fallback ? out || opts.fallback : out;
}

/**
 * A slug no other row in `table` is using: `base`, then `base-2`, `base-3` …
 * up to `attempts` tries, then a timestamp suffix. `ignoreId` is the row being
 * saved, so it does not collide with itself.
 */
export async function uniqueSlug(
  db: any,
  table: "events" | "posts" | "programmes",
  base: string,
  opts: { ignoreId?: string; fallbackRoot?: string; attempts?: number } = {}
): Promise<string> {
  const root = base || opts.fallbackRoot || table.replace(/s$/, "");
  const attempts = opts.attempts ?? 25;
  for (let i = 0; i < attempts; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    let q = db.from(table).select("id").eq("slug", candidate).limit(1);
    if (opts.ignoreId) q = q.neq("id", opts.ignoreId);
    const { data } = await q;
    if (!data || data.length === 0) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
