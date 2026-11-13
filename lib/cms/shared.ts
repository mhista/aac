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

/* ── Blank drafts ──────────────────────────────────────────────────── */

/**
 * The newest draft this person started and never touched, or null.
 *
 * "New article", "New event" and "New programme" create a row the moment
 * they are pressed — the editor needs an id to save into. Before this, every
 * press that was then abandoned (closed the tab, went back, came back
 * tomorrow) left another "Untitled …" behind, and the lists filled up with
 * them. Now a press first looks for one of the person's own drafts that is
 * still exactly as it was created — placeholder title, every content field
 * empty — and opens that instead.
 *
 * A draft with anything in it, even just a title, is never reused. Someone
 * else's blank draft is never reused. If the lookup fails for any reason the
 * caller simply creates a new draft, as it always did.
 */
export async function findBlankDraft(
  db: any,
  table: "events" | "posts" | "programmes",
  ownerId: string,
  placeholderTitle: string,
  emptyColumns: string[]
): Promise<string | null> {
  try {
    let q = db
      .from(table)
      .select("id")
      .eq("status", "draft")
      .eq("created_by", ownerId)
      .eq("title", placeholderTitle);
    for (const col of emptyColumns) q = q.is(col, null);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(5);
    if (error || !data?.length) return null;

    if (table !== "events") return data[0].id as string;

    /* An event's photographs live in their own table, so "untouched" also
       means nothing has been added to its gallery. */
    for (const row of data as { id: string }[]) {
      const { count } = await db
        .from("event_media")
        .select("id", { count: "exact", head: true })
        .eq("event_id", row.id);
      if (!count) return row.id;
    }
    return null;
  } catch {
    return null;
  }
}
