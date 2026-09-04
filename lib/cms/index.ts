/**
 * CMS data layer.
 *
 * THE RULE: no demo data, ever. Every query returns real rows from Supabase or
 * an empty array. Sections receiving empty data render their designed empty
 * state, or return null and disappear. Nothing on this site is invented.
 *
 * The site is fully functional before the CMS exists — it simply shows less.
 * As the dashboard lands and rows appear, sections light up on their own.
 */

import { createClient } from "@/lib/supabase/server";
import { ORG } from "@/lib/org";

/* ── Types ─────────────────────────────────────────────────────────── */

export type Status = "draft" | "in_review" | "changes_requested" | "scheduled" | "published" | "archived";

export interface MediaRef {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  lqip?: string;
}

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  event_type: string | null;
  body?: unknown;
  cover: MediaRef | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  attendance: number | null;
  display_index: number | null;
}

export interface PostRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover: MediaRef | null;
  category: { name: string; slug: string; colour_token: string } | null;
  read_minutes: number | null;
  published_at: string | null;
  author: { full_name: string; role_title: string | null; photo: MediaRef | null } | null;
  /* Only loaded by getPost — the index query does not select it, because
     shipping every article body to render a list of cards is wasteful. */
  body?: string | null;
  tags?: string[] | null;
  medically_reviewed_by?: string | null;
  reviewed_at?: string | null;
  seo?: { title?: string; description?: string } | null;
}

export interface ProgrammeRecord {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  pillar: string | null;
  cover: MediaRef | null;
  status_label: string | null;
  locations: string[] | null;
}

export interface TeamMember {
  id: string;
  full_name: string;
  role_title: string | null;
  tier: "board" | "director" | "regional" | "campus" | null;
  bio: string | null;
  photo: MediaRef | null;
  linkedin: string | null;
}

export interface ImpactMetric {
  key: string;
  label: string;
  value_numeric: number | null;
  value_display: string | null;
  unit: string | null;
  as_of: string | null;
  is_headline: boolean;
  methodology_note: string | null;
}

export interface Partner {
  id: string;
  name: string;
  logo: MediaRef | null;
  url: string | null;
}

export interface Testimonial {
  id: string;
  quote: string;
  author_name: string;
  author_role: string | null;
  photo: MediaRef | null;
}

export interface Chapter {
  id: string;
  name: string;
  university: string;
  city: string | null;
  country: string;
  member_count: number | null;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

/* ── Safe query helper ─────────────────────────────────────────────────
   If Supabase isn't configured yet, or the table doesn't exist, or the
   query errors — we return the empty fallback rather than crashing the
   page. A missing CMS must never take the website down.               */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function safe<T>(
  run: (db: any) => Promise<{ data: any; error: any }>,
  fallback: T,
  label: string
): Promise<T> {
  const db = await createClient();
  if (!db) return fallback;
  try {
    const { data, error } = await run(db);
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[cms] ${label}: table not ready — rendering empty state`);
      }
      return fallback;
    }
    return (data as T) ?? fallback;
  } catch {
    return fallback;
  }
}

const PUBLISHED = { column: "status", value: "published" } as const;

/* ── Queries ───────────────────────────────────────────────────────── */

export async function getEvents(opts: { limit?: number; upcoming?: boolean } = {}): Promise<EventRecord[]> {
  return safe<EventRecord[]>(
    async (db) => {
      let q = db
        .from("events")
        .select("id,slug,title,subtitle,event_type,cover,starts_at,ends_at,venue,city,country,attendance,display_index")
        .eq(PUBLISHED.column, PUBLISHED.value);
      if (opts.upcoming === true) q = q.gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true });
      else if (opts.upcoming === false) q = q.lt("starts_at", new Date().toISOString()).order("starts_at", { ascending: false });
      else q = q.order("starts_at", { ascending: false });
      if (opts.limit) q = q.limit(opts.limit);
      return await q;
    },
    [],
    "events"
  );
}

export async function getEvent(slug: string): Promise<EventRecord | null> {
  const rows = await safe<EventRecord[]>(
    async (db) => await db.from("events").select("*").eq("slug", slug).eq(PUBLISHED.column, PUBLISHED.value).limit(1),
    [],
    "event"
  );
  return rows[0] ?? null;
}

export async function getEventMedia(eventId: string): Promise<MediaRef[]> {
  return safe<MediaRef[]>(
    async (db) => await db.from("event_media").select("url,alt,width,height,lqip,caption").eq("event_id", eventId).order("position"),
    [],
    "event_media"
  );
}

export async function getPosts(opts: { limit?: number; category?: string } = {}): Promise<PostRecord[]> {
  return safe<PostRecord[]>(
    async (db) => {
      let q = db
        .from("posts")
        .select("id,slug,title,excerpt,cover,category,read_minutes,published_at,author")
        .eq(PUBLISHED.column, PUBLISHED.value)
        .order("published_at", { ascending: false });
      if (opts.category) q = q.eq("category_slug", opts.category);
      if (opts.limit) q = q.limit(opts.limit);
      return await q;
    },
    [],
    "posts"
  );
}

export async function getPost(slug: string): Promise<PostRecord | null> {
  const rows = await safe<PostRecord[]>(
    async (db) => await db.from("posts").select("*").eq("slug", slug).eq(PUBLISHED.column, PUBLISHED.value).limit(1),
    [],
    "post"
  );
  return rows[0] ?? null;
}

export async function getProgrammes(opts: { limit?: number; pillar?: string } = {}): Promise<ProgrammeRecord[]> {
  return safe<ProgrammeRecord[]>(
    async (db) => {
      let q = db
        .from("programmes")
        .select("id,slug,title,subtitle,excerpt,pillar,cover,status_label,locations")
        .eq(PUBLISHED.column, PUBLISHED.value)
        .order("created_at", { ascending: false });
      if (opts.pillar) q = q.eq("pillar", opts.pillar);
      if (opts.limit) q = q.limit(opts.limit);
      return await q;
    },
    [],
    "programmes"
  );
}

export async function getProgramme(slug: string): Promise<ProgrammeRecord | null> {
  const rows = await safe<ProgrammeRecord[]>(
    async (db) => await db.from("programmes").select("*").eq("slug", slug).eq(PUBLISHED.column, PUBLISHED.value).limit(1),
    [],
    "programme"
  );
  return rows[0] ?? null;
}

export async function getTeam(tier?: TeamMember["tier"]): Promise<TeamMember[]> {
  return safe<TeamMember[]>(
    async (db) => {
      let q = db.from("team_members").select("*").eq("is_published", true).order("position");
      if (tier) q = q.eq("tier", tier);
      return await q;
    },
    [],
    "team_members"
  );
}

export async function getPartners(): Promise<Partner[]> {
  return safe<Partner[]>(
    async (db) => await db.from("partners").select("id,name,logo,url").eq("is_published", true).order("position"),
    [],
    "partners"
  );
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return safe<Testimonial[]>(
    async (db) => await db.from("testimonials").select("*").eq("is_published", true).order("position"),
    [],
    "testimonials"
  );
}

export async function getChapters(): Promise<Chapter[]> {
  return safe<Chapter[]>(
    async (db) => await db.from("chapters").select("id,name,university,city,country,member_count").eq("status", "active").order("name"),
    [],
    "chapters"
  );
}

export async function getFaqs(category?: string): Promise<Faq[]> {
  return safe<Faq[]>(
    async (db) => {
      let q = db.from("faqs").select("*").eq("is_published", true).order("position");
      if (category) q = q.eq("category", category);
      return await q;
    },
    [],
    "faqs"
  );
}

/**
 * Impact metrics.
 *
 * These are the one exception to "nothing until the CMS": the figures in
 * lib/org.ts are real, supplied by AAC, and dated. They seed the site so the
 * impact section is truthful from day one. The moment a row exists in
 * `impact_metrics` it wins — the CMS becomes the source of truth and these
 * constants stop being read.
 *
 * A metric with a null value renders the "measurement in progress" state.
 * It is never padded, never rounded up, never invented.
 */
export async function getImpactMetrics(opts: { headlineOnly?: boolean } = {}): Promise<ImpactMetric[]> {
  const rows = await safe<ImpactMetric[]>(
    async (db) => {
      let q = db.from("impact_metrics").select("*").eq("is_published", true).order("position");
      if (opts.headlineOnly) q = q.eq("is_headline", true);
      return await q;
    },
    [],
    "impact_metrics"
  );
  if (rows.length > 0) return rows;
  const seed = ORG.impact.filter((m) => (opts.headlineOnly ? m.is_headline : true));
  return seed as ImpactMetric[];
}


/* ── Site settings ───────────────────────────────────────────────────
   Feature flags live in the CMS so someone without a developer can open and
   close applications. Defaults are deliberately CLOSED: if the database is
   unreachable we must not invite people into a form nobody is reading. */

export interface ApplicationSettings {
  open: boolean;
  closedNote: string | null;
  forms: { country: string; url: string }[];
}

export async function getApplicationSettings(): Promise<ApplicationSettings> {
  const rows = await safe<{ feature_flags: any }[]>(
    async (db) => await db.from("site_settings").select("feature_flags").eq("id", 1).limit(1),
    [],
    "site_settings"
  );

  const flags = rows[0]?.feature_flags ?? {};
  const cmsForms = Array.isArray(flags.application_forms) ? flags.application_forms : null;

  return {
    open: flags.applications_open === true,
    closedNote: typeof flags.applications_closed_note === "string" ? flags.applications_closed_note : null,
    forms: cmsForms?.length ? cmsForms : [...ORG.applicationForms],
  };
}


/* ── Page sections ───────────────────────────────────────────────────
   The homepage is assembled from a registry rather than hard-coded, so a
   section with nothing to show can be switched off without a deploy. That was
   the point of the CMS from the start: a page that always renders every
   section is a page that always has something half-empty on it.

   The fallback matters. If the table is unreachable — no database yet, RLS
   refusing, a migration mid-run — every section shows. A homepage that
   silently loses half its content because a query failed is far worse than
   one that ignores a toggle. */

export interface PageSection {
  type: string;
  position: number;
  is_visible: boolean;
  config: Record<string, unknown>;
}

export async function getPageSections(slug: string): Promise<PageSection[] | null> {
  const rows = await safe<PageSection[]>(
    async (db) => {
      const { data: page } = await db.from("pages").select("id").eq("slug", slug).single();
      if (!page) return { data: null, error: null } as never;
      return await db
        .from("page_sections")
        .select("type,position,is_visible,config")
        .eq("page_id", page.id)
        .order("position");
    },
    [],
    "page_sections"
  );
  /* null means "no opinion" — render everything. */
  return rows.length ? rows : null;
}


/* ── Site settings ───────────────────────────────────────────────────
   The database overrides lib/org.ts; it never replaces it. An empty field
   means "use the default", so a settings row that is missing, unreachable or
   half-filled can never blank out the contact address in the footer. */

export interface ResolvedSettings {
  name: string;
  abbr: string;
  tagline: string;
  registration: { body: string; number: string; country: string };
  email: { general: string; support: string };
  social: { name: string; url: string; profile: boolean }[];
  applicationForms: { country: string; url: string }[];
  flags: { donations: boolean; newsletter: boolean; chatbot: boolean; applicationsOpen: boolean };
}

export async function getSiteSettings(): Promise<ResolvedSettings> {
  const rows = await safe<{ org: any; contact: any; socials: any; feature_flags: any }[]>(
    async (db) => await db.from("site_settings").select("org,contact,socials,feature_flags").eq("id", 1).limit(1),
    [],
    "site_settings"
  );
  const r = rows[0];
  const org = r?.org ?? {};
  const contact = r?.contact ?? {};
  const socials = r?.socials ?? {};
  const flags = r?.feature_flags ?? {};

  /* Socials are stored keyed by platform. Fall back to the coded list, and
     keep the coded display names so "linkedin" still renders as "LinkedIn". */
  const coded = ORG.social;
  const social = Object.keys(socials).length
    ? coded
        .map((c) => ({ ...c, url: socials[c.name.toLowerCase()] ?? c.url }))
        .filter((c) => c.url)
    : coded;

  const forms = Array.isArray(flags.application_forms) && flags.application_forms.length
    ? flags.application_forms
    : [...ORG.applicationForms];

  return {
    name: org.name || ORG.name,
    abbr: org.abbr || "AAC",
    tagline: org.tagline || ORG.tagline,
    registration: {
      body: org.registrationBody || ORG.registration.body,
      number: org.registrationNumber || ORG.registration.number,
      country: org.country || ORG.registration.country,
    },
    email: {
      general: contact.general || ORG.email.general,
      support: contact.support || ORG.email.support,
    },
    social,
    applicationForms: forms,
    flags: {
      donations: flags.donations === true,
      newsletter: flags.newsletter !== false,
      chatbot: flags.chatbot === true,
      applicationsOpen: flags.applications_open === true,
    },
  };
}
