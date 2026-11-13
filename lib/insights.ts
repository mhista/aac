import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/permissions";
import { canRead } from "@/lib/auth/capabilities";
import { seesEverything } from "@/lib/auth/reach";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Insights — the numbers behind the dashboard, for the people who lead.
 *
 * WHO SEES WHAT. The view follows the hierarchy. Admins, directors and board
 * members see the whole organisation and can narrow to any region, zone or
 * chapter. A regional coordinator starts at their region and can narrow to
 * its zones and chapters; a zonal coordinator, their zone and its chapters; a
 * campus coordinator, their own chapter. Asking for a scope outside your
 * remit quietly falls back to your own — and the database's row-level
 * security is still the real boundary underneath all of this.
 *
 * WHAT IS COUNTED. Only what the dashboard already records, and only what has
 * actually happened: published events that took place in the period (by their
 * date, not when they were posted), articles published, advocates who signed
 * up, and impact reports a coordinator has verified. Nothing is estimated or
 * extrapolated, and two different measures are never added together — event
 * attendance and advocate-reported reach are shown side by side, not summed,
 * because the same person can appear in both.
 *
 * Every figure is compared with the period immediately before it, of the same
 * length, so "up 20%" always means the same thing.
 */

export type Period = "30d" | "90d" | "12m";
export const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "12m", label: "Last 12 months", days: 365 },
];

type Level = "all" | "aac" | "region" | "zone" | "chapter";
export type ScopeOption = { value: string; label: string; level: Level; depth: number };

type ChapterRow = { id: string; name: string; region_id: string | null; zone_id: string | null };
type Named = { id: string; name: string; region_id?: string | null };

export type Metric = { current: number; previous: number };
export type SeriesPoint = { label: string; from: string; value: number };
export type BreakdownRow = {
  key: string;
  label: string;
  href?: string;
  events: number;
  attendance: number;
  screenings: number;
  advocates: number;
  articles: number;
  verifiedReach: number;
  lastActivity: string | null;
};
export type FeedItem = {
  kind: "Event" | "Article" | "Advocate" | "Impact report";
  title: string;
  status: string | null;
  at: string;
  href: string;
  where: string;
};

export type Insights = {
  scope: ScopeOption;
  scopeOptions: ScopeOption[];
  period: (typeof PERIODS)[number];
  range: { from: string; to: string; prevFrom: string };
  kpis: {
    events: Metric;
    attendance: Metric;
    screenings: Metric;
    materials: Metric;
    advocates: Metric;
    articles: Metric;
    verifiedReach: Metric;
    applications?: Metric;
    enquiries?: Metric;
  };
  series: {
    events: SeriesPoint[];
    attendance: SeriesPoint[];
    advocates: SeriesPoint[];
    articles: SeriesPoint[];
  };
  breakdown: { unit: string; rows: BreakdownRow[] } | null;
  eventsInPeriod: { title: string; slug: string; date: string; where: string; attendance: number | null; screenings: number | null }[];
  pipeline: { label: string; status: string; events: number; articles: number }[];
  feed: FeedItem[];
  reachable: boolean;
};

const NIL = "00000000-0000-0000-0000-000000000000";
const DAY = 86_400_000;

/* Supabase returns at most 1,000 rows a request, so long lists are read in
   pages. 20,000 rows is far beyond any period this page asks for; the cap is
   there so a mistake can never turn into an endless loop. */
async function fetchAll(make: () => any, cap = 20_000): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await make().range(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/* ── Scope ─────────────────────────────────────────────────────────── */

async function loadScopeOptions(db: any, p: Profile) {
  const [{ data: regions }, { data: zones }, { data: chapters }] = await Promise.all([
    db.from("regions").select("id,name").order("name"),
    db.from("zones").select("id,name,region_id").order("name"),
    db.from("chapters").select("id,name,university,region_id,zone_id").order("name").limit(2000),
  ]);
  const allRegions: Named[] = regions ?? [];
  const allZones: Named[] = zones ?? [];
  const allChapters: ChapterRow[] = (chapters ?? []).map((c: any) => ({
    id: c.id,
    name: c.name || c.university || "Chapter",
    region_id: c.region_id,
    zone_id: c.zone_id,
  }));

  const options: ScopeOption[] = [];
  const zoneRegion = new Map(allZones.map((z) => [z.id, z.region_id ?? null]));
  const chapterInRegion = (c: ChapterRow, r: string) =>
    c.region_id === r || (!!c.zone_id && zoneRegion.get(c.zone_id) === r);

  if (seesEverything(p)) {
    options.push({ value: "all", label: "All of AAC", level: "all", depth: 0 });
    options.push({ value: "aac", label: "AAC national (no chapter)", level: "aac", depth: 1 });
    for (const r of allRegions) {
      options.push({ value: `region:${r.id}`, label: r.name, level: "region", depth: 1 });
      for (const z of allZones.filter((z) => z.region_id === r.id)) {
        options.push({ value: `zone:${z.id}`, label: z.name, level: "zone", depth: 2 });
      }
    }
    for (const z of allZones.filter((z) => !z.region_id)) {
      options.push({ value: `zone:${z.id}`, label: z.name, level: "zone", depth: 1 });
    }
    for (const c of allChapters) {
      options.push({ value: `chapter:${c.id}`, label: c.name, level: "chapter", depth: 3 });
    }
  } else if (p.role === "regional_coordinator" && p.region_id) {
    const r = allRegions.find((r) => r.id === p.region_id);
    options.push({ value: `region:${p.region_id}`, label: r?.name ?? "Your region", level: "region", depth: 0 });
    for (const z of allZones.filter((z) => z.region_id === p.region_id)) {
      options.push({ value: `zone:${z.id}`, label: z.name, level: "zone", depth: 1 });
    }
    for (const c of allChapters.filter((c) => chapterInRegion(c, p.region_id!))) {
      options.push({ value: `chapter:${c.id}`, label: c.name, level: "chapter", depth: 2 });
    }
  } else if (p.role === "zonal_coordinator" && p.zone_id) {
    const z = allZones.find((z) => z.id === p.zone_id);
    options.push({ value: `zone:${p.zone_id}`, label: z?.name ?? "Your zone", level: "zone", depth: 0 });
    for (const c of allChapters.filter((c) => c.zone_id === p.zone_id)) {
      options.push({ value: `chapter:${c.id}`, label: c.name, level: "chapter", depth: 1 });
    }
  } else if (p.chapter_id) {
    const c = allChapters.find((c) => c.id === p.chapter_id);
    options.push({ value: `chapter:${p.chapter_id}`, label: c?.name ?? "Your chapter", level: "chapter", depth: 0 });
  }

  return { options, allRegions, allZones, allChapters, chapterInRegion };
}

/* ── The report ────────────────────────────────────────────────────── */

export async function getInsights(
  p: Profile,
  req: { scope?: string; period?: string }
): Promise<Insights | null> {
  const db = await createClient();
  if (!db) return null;
  return computeInsights(db, p, req);
}

/** The report itself, given a database client — separate so it can be tested. */
export async function computeInsights(
  db: any,
  p: Profile,
  req: { scope?: string; period?: string },
  now: number = Date.now()
): Promise<Insights> {

  const { options, allRegions, allZones, allChapters, chapterInRegion } = await loadScopeOptions(db, p);
  const scope = options.find((o) => o.value === req.scope) ?? options[0];
  const period = PERIODS.find((x) => x.id === req.period) ?? PERIODS[1];

  const to = new Date(now).toISOString();
  const from = new Date(now - period.days * DAY).toISOString();
  const prevFrom = new Date(now - 2 * period.days * DAY).toISOString();

  if (!scope) {
    return emptyInsights(period, { from, to, prevFrom });
  }

  /* The chapters in scope. null means "no chapter filter at all" — the whole
     organisation, national work included. */
  const [level, id] = scope.value.includes(":") ? scope.value.split(":") : [scope.value, ""];
  let chapterIds: string[] | null = null;
  let nationalOnly = false;
  if (level === "aac") nationalOnly = true;
  else if (level === "region") chapterIds = allChapters.filter((c) => chapterInRegion(c, id)).map((c) => c.id);
  else if (level === "zone") chapterIds = allChapters.filter((c) => c.zone_id === id).map((c) => c.id);
  else if (level === "chapter") chapterIds = [id];

  const scoped = (q: any) => {
    if (nationalOnly) return q.is("chapter_id", null);
    if (chapterIds === null) return q;
    return q.in("chapter_id", chapterIds.length ? chapterIds : [NIL]);
  };

  /* ── Rows for both periods at once ── */
  const [events, posts, advocates, reports] = await Promise.all([
    fetchAll(() =>
      scoped(
        db
          .from("events")
          .select("id,title,slug,starts_at,attendance,screenings_done,materials_distributed,chapter_id")
          .eq("status", "published")
          .gte("starts_at", prevFrom)
          .lte("starts_at", to)
          .order("starts_at", { ascending: false })
      )
    ),
    fetchAll(() =>
      scoped(
        db
          .from("posts")
          .select("id,published_at,chapter_id")
          .eq("status", "published")
          .gte("published_at", prevFrom)
          .lte("published_at", to)
      )
    ),
    canRead(p, "advocates")
      ? fetchAll(() =>
          scoped(db.from("advocates").select("id,created_at,chapter_id").gte("created_at", prevFrom).lte("created_at", to))
        )
      : Promise.resolve([]),
    canRead(p, "impactReports")
      ? fetchAll(() =>
          scoped(
            db
              .from("impact_reports")
              .select("id,people_reached,activity_date,chapter_id")
              .eq("status", "verified")
              .gte("activity_date", prevFrom.slice(0, 10))
              .lte("activity_date", to.slice(0, 10))
          )
        )
      : Promise.resolve([]),
  ]);

  const inCur = (iso: string | null) => !!iso && iso >= from && iso <= to;
  const inPrev = (iso: string | null) => !!iso && iso >= prevFrom && iso < from;
  const dateOf = (d: string | null) => (d && d.length === 10 ? `${d}T12:00:00.000Z` : d);

  const metric = <T>(rows: T[], at: (r: T) => string | null, val: (r: T) => number = () => 1): Metric => {
    let current = 0;
    let previous = 0;
    for (const r of rows) {
      const t = at(r);
      if (inCur(t)) current += val(r);
      else if (inPrev(t)) previous += val(r);
    }
    return { current, previous };
  };

  const kpis: Insights["kpis"] = {
    events: metric(events, (e) => e.starts_at),
    attendance: metric(events, (e) => e.starts_at, (e) => e.attendance ?? 0),
    screenings: metric(events, (e) => e.starts_at, (e) => e.screenings_done ?? 0),
    materials: metric(events, (e) => e.starts_at, (e) => e.materials_distributed ?? 0),
    advocates: metric(advocates, (a) => a.created_at),
    articles: metric(posts, (x) => x.published_at),
    verifiedReach: metric(reports, (r) => dateOf(r.activity_date), (r) => r.people_reached ?? 0),
  };

  /* Organisation-wide queues: only for people who manage them, and only when
     looking at the whole organisation (they are not tied to a chapter). */
  if (level === "all") {
    const count = async (table: string, col: string, a: string, b: string) => {
      const { count } = await db.from(table).select("id", { count: "exact", head: true }).gte(col, a).lt(col, b);
      return count ?? 0;
    };
    if (canRead(p, "applications")) {
      const [c, pr] = await Promise.all([count("applications", "created_at", from, to), count("applications", "created_at", prevFrom, from)]);
      kpis.applications = { current: c, previous: pr };
    }
    if (canRead(p, "enquiries")) {
      const [c, pr] = await Promise.all([count("form_submissions", "created_at", from, to), count("form_submissions", "created_at", prevFrom, from)]);
      kpis.enquiries = { current: c, previous: pr };
    }
  }

  /* ── Trend buckets (current period only) ── */
  const buckets = makeBuckets(period.id, now);
  const bucketOf = (iso: string | null) => {
    if (!iso || !inCur(iso)) return -1;
    const t = Date.parse(iso);
    for (let i = buckets.length - 1; i >= 0; i--) if (t >= buckets[i].start) return i;
    return -1;
  };
  const series = (rows: any[], at: (r: any) => string | null, val: (r: any) => number = () => 1) => {
    const sums = buckets.map(() => 0);
    for (const r of rows) {
      const i = bucketOf(at(r));
      if (i >= 0) sums[i] += val(r);
    }
    return buckets.map((b, i) => ({ label: b.label, from: new Date(b.start).toISOString(), value: sums[i] }));
  };

  /* ── Breakdown one level down ── */
  const chapterById = new Map(allChapters.map((c) => [c.id, c]));
  const zoneById = new Map(allZones.map((z) => [z.id, z]));
  const regionById = new Map(allRegions.map((r) => [r.id, r]));
  const zoneRegion = (zid: string | null) => (zid ? zoneById.get(zid)?.region_id ?? null : null);

  let unit = "";
  let unitOf: ((chapterId: string | null) => { key: string; label: string; href?: string }) | null = null;
  if (level === "all") {
    unit = "Region";
    unitOf = (cid) => {
      if (!cid) return { key: "aac", label: "AAC national", href: "?scope=aac" };
      const c = chapterById.get(cid);
      const rid = c?.region_id ?? zoneRegion(c?.zone_id ?? null);
      return rid
        ? { key: rid, label: regionById.get(rid)?.name ?? "Region", href: `?scope=region:${rid}` }
        : { key: "none", label: "Chapters with no region" };
    };
  } else if (level === "region") {
    unit = "Zone";
    unitOf = (cid) => {
      const z = cid ? chapterById.get(cid)?.zone_id : null;
      return z
        ? { key: z, label: zoneById.get(z)?.name ?? "Zone", href: `?scope=zone:${z}` }
        : { key: "none", label: "Chapters with no zone" };
    };
  } else if (level === "zone") {
    unit = "Chapter";
    unitOf = (cid) => ({
      key: cid ?? "none",
      label: (cid && chapterById.get(cid)?.name) || "Chapter",
      href: cid ? `?scope=chapter:${cid}` : undefined,
    });
  }

  let breakdown: Insights["breakdown"] = null;
  if (unitOf) {
    const rows = new Map<string, BreakdownRow>();
    const row = (cid: string | null) => {
      const u = unitOf!(cid);
      if (!rows.has(u.key)) {
        rows.set(u.key, { ...u, events: 0, attendance: 0, screenings: 0, advocates: 0, articles: 0, verifiedReach: 0, lastActivity: null });
      }
      return rows.get(u.key)!;
    };
    const touch = (r: BreakdownRow, iso: string | null) => {
      if (iso && (!r.lastActivity || iso > r.lastActivity)) r.lastActivity = iso;
    };
    /* Every unit in scope gets a row, even a silent one — a chapter with
       nothing this quarter is exactly what a coordinator needs to see. */
    if (level === "all") allRegions.forEach((r) => rows.has(r.id) || rows.set(r.id, blankRow(r.id, r.name, `?scope=region:${r.id}`)));
    if (level === "region") allZones.filter((z) => z.region_id === id).forEach((z) => rows.has(z.id) || rows.set(z.id, blankRow(z.id, z.name, `?scope=zone:${z.id}`)));
    if (level === "zone") (chapterIds ?? []).forEach((cid) => row(cid));

    for (const e of events) if (inCur(e.starts_at)) { const r = row(e.chapter_id); r.events++; r.attendance += e.attendance ?? 0; r.screenings += e.screenings_done ?? 0; touch(r, e.starts_at); }
    for (const a of advocates) if (inCur(a.created_at)) { const r = row(a.chapter_id); r.advocates++; touch(r, a.created_at); }
    for (const x of posts) if (inCur(x.published_at)) { const r = row(x.chapter_id); r.articles++; touch(r, x.published_at); }
    for (const rp of reports) { const t = dateOf(rp.activity_date); if (inCur(t)) { const r = row(rp.chapter_id); r.verifiedReach += rp.people_reached ?? 0; touch(r, t); } }

    breakdown = {
      unit,
      rows: [...rows.values()].sort((a, b) => b.attendance - a.attendance || b.events - a.events || a.label.localeCompare(b.label)),
    };
  }

  const placeName = (cid: string | null) => (cid ? chapterById.get(cid)?.name ?? "Chapter" : "AAC");
  const eventsInPeriod = events
    .filter((e) => inCur(e.starts_at))
    .slice(0, 50)
    .map((e) => ({
      title: e.title,
      slug: e.slug,
      date: e.starts_at,
      where: placeName(e.chapter_id),
      attendance: e.attendance,
      screenings: e.screenings_done,
    }));

  /* ── Work in progress (now, not windowed) ── */
  const statusCounts = async (table: "events" | "posts") => {
    const rows = await fetchAll(() => scoped(db.from(table).select("status").neq("status", "published").neq("status", "archived")), 5000);
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.status, (m.get(r.status) ?? 0) + 1);
    return m;
  };
  const [evStatus, postStatus] = await Promise.all([statusCounts("events"), statusCounts("posts")]);
  const pipeline = [
    { label: "Drafts", status: "draft" },
    { label: "In review", status: "in_review" },
    { label: "Changes requested", status: "changes_requested" },
    { label: "Scheduled", status: "scheduled" },
  ].map((s) => ({ ...s, events: evStatus.get(s.status) ?? 0, articles: postStatus.get(s.status) ?? 0 }));

  /* ── What changed recently ── */
  const recent = async (table: string, cols: string, orderCol: string) => {
    const { data } = await scoped(db.from(table).select(cols)).order(orderCol, { ascending: false }).limit(8);
    return data ?? [];
  };
  const [rEvents, rPosts, rAdvocates, rReports] = await Promise.all([
    recent("events", "id,title,status,updated_at,chapter_id", "updated_at"),
    recent("posts", "id,title,status,updated_at,chapter_id", "updated_at"),
    canRead(p, "advocates") ? recent("advocates", "id,first_name,last_name,status,created_at,chapter_id", "created_at") : Promise.resolve([]),
    canRead(p, "impactReports") ? recent("impact_reports", "id,title,status,created_at,chapter_id", "created_at") : Promise.resolve([]),
  ]);
  const feed: FeedItem[] = [
    ...rEvents.map((e: any) => ({ kind: "Event" as const, title: e.title, status: e.status, at: e.updated_at, href: `/dashboard/events/${e.id}`, where: placeName(e.chapter_id) })),
    ...rPosts.map((x: any) => ({ kind: "Article" as const, title: x.title, status: x.status, at: x.updated_at, href: `/dashboard/blog/${x.id}`, where: placeName(x.chapter_id) })),
    ...rAdvocates.map((a: any) => ({ kind: "Advocate" as const, title: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "New advocate", status: a.status, at: a.created_at, href: "/dashboard/people", where: placeName(a.chapter_id) })),
    ...rReports.map((r: any) => ({ kind: "Impact report" as const, title: r.title, status: r.status, at: r.created_at, href: "/dashboard/impact-reports", where: placeName(r.chapter_id) })),
  ]
    .filter((f) => f.at)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 12);

  return {
    scope,
    scopeOptions: options,
    period,
    range: { from, to, prevFrom },
    kpis,
    series: {
      events: series(events, (e) => e.starts_at),
      attendance: series(events, (e) => e.starts_at, (e) => e.attendance ?? 0),
      advocates: series(advocates, (a) => a.created_at),
      articles: series(posts, (x) => x.published_at),
    },
    breakdown,
    eventsInPeriod,
    pipeline,
    feed,
    reachable: true,
  };
}

function blankRow(key: string, label: string, href?: string): BreakdownRow {
  return { key, label, href, events: 0, attendance: 0, screenings: 0, advocates: 0, articles: 0, verifiedReach: 0, lastActivity: null };
}

/** Weekly buckets for 30 and 90 days, monthly for twelve months; oldest first. */
function makeBuckets(period: Period, now: number): { start: number; label: string }[] {
  const fmt = (t: number, monthOnly: boolean) =>
    new Date(t).toLocaleDateString("en-GB", monthOnly ? { month: "short", timeZone: "Africa/Lagos" } : { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
  if (period === "12m") {
    const d = new Date(now);
    const out: { start: number; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1);
      out.push({ start: i === 11 ? Math.min(start, now - 365 * DAY) : start, label: fmt(start, true) });
    }
    return out;
  }
  const days = period === "30d" ? 30 : 90;
  const weeks = Math.ceil(days / 7);
  const begin = now - days * DAY;
  return Array.from({ length: weeks }, (_, i) => {
    const start = begin + i * 7 * DAY;
    return { start, label: fmt(start, false) };
  });
}

function emptyInsights(period: (typeof PERIODS)[number], range: Insights["range"]): Insights {
  const zero = { current: 0, previous: 0 };
  return {
    scope: { value: "", label: "Nothing in reach", level: "chapter", depth: 0 },
    scopeOptions: [],
    period,
    range,
    kpis: { events: zero, attendance: zero, screenings: zero, materials: zero, advocates: zero, articles: zero, verifiedReach: zero },
    series: { events: [], attendance: [], advocates: [], articles: [] },
    breakdown: null,
    eventsInPeriod: [],
    pipeline: [],
    feed: [],
    reachable: false,
  };
}

/** "+12%", "−5%", "new" or "no change" — compared with the period before. */
export function changeLabel(m: Metric): { text: string; dir: "up" | "down" | "flat" } {
  if (m.current === m.previous) return { text: "No change", dir: "flat" };
  if (m.previous === 0) return { text: "New this period", dir: "up" };
  const pct = Math.round(((m.current - m.previous) / m.previous) * 100);
  if (pct === 0) return { text: "About the same", dir: "flat" };
  return { text: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`, dir: pct > 0 ? "up" : "down" };
}
