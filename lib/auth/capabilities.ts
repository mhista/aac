import { RANK, type Profile, type Role } from "./permissions";

/**
 * What each role may do, stated explicitly.
 *
 * A single rank threshold cannot describe this organisation. `content_lead`
 * (40) exists to write and publish, and must reach the blog and the programme
 * pages. `campus_coordinator` (50) outranks them numerically but runs one
 * campus and must never touch the national board list. Any rule of the form
 * "rank >= n" gets one of those two wrong.
 *
 * So capability is a matrix, not a number. It is verbose on purpose: someone
 * asking "can a regional coordinator edit the impact figures?" should be able
 * to answer it by reading one line, not by tracing three helper functions.
 *
 * THIS IS NOT THE SECURITY BOUNDARY. Postgres RLS is (009_capabilities.sql
 * mirrors this table). This decides what the interface offers; the database
 * decides what actually happens. They are kept deliberately identical, and
 * where they disagree the database wins and the person sees an error.
 */

export type Area =
  | "events" | "blog" | "media" | "programmes" | "pages"
  | "chapters" | "advocates" | "applications" | "impactReports"
  | "impactMetrics" | "team" | "campusTeam" | "enquiries"
  | "users" | "settings" | "audit";

type Grant = {
  /** Who may open the section at all. */
  read: Role[];
  /** Who may change things in it. */
  write: Role[];
  /** Who may remove things permanently. */
  remove: Role[];
  /**
   * True when a writer below coordinator level only reaches their own chapter's
   * rows. Enforced in RLS; repeated here so the UI can say so.
   */
  scoped?: boolean;
};

/* Shorthands. Board members are the standing exception: they read everything
   in the organisation and write nothing — transparency without operational
   risk — so they appear in `read` lists and never in `write`. */
const ADMIN: Role[] = ["super_admin", "admin"];
const DIRECTORS: Role[] = [...ADMIN, "department_director"];
const COORDINATORS: Role[] = [...DIRECTORS, "regional_coordinator"];
const CAMPUS: Role[] = [...COORDINATORS, "zonal_coordinator", "campus_coordinator"];
const EDITORS: Role[] = [...DIRECTORS, "content_lead"];
const AUTHORS: Role[] = [...CAMPUS, "content_lead", "contributor"];
const ALL_STAFF: Role[] = [...AUTHORS, "board_member"];

export const CAPABILITIES: Record<Area, Grant> = {
  /* ── Content anyone on staff contributes to ─────────────────────── */
  events: { read: ALL_STAFF, write: AUTHORS, remove: COORDINATORS, scoped: true },
  blog: { read: ALL_STAFF, write: AUTHORS, remove: COORDINATORS, scoped: true },
  media: { read: ALL_STAFF, write: AUTHORS, remove: ADMIN },

  /* ── National content: shaped centrally, not per campus ─────────── */
  programmes: { read: ALL_STAFF, write: EDITORS, remove: ADMIN },
  pages: { read: [...EDITORS, "board_member"], write: EDITORS, remove: ADMIN },

  /* ── Governance and the public face of the organisation ─────────
     A campus coordinator running one university has no business editing
     the board list or the headline impact figures. This is the gap that
     let that happen. */
  team: { read: [...DIRECTORS, "board_member"], write: DIRECTORS, remove: ADMIN },

  /* A chapter's own committee is not governance. It changes every academic
     year, it is the coordinator's to keep current, and it appears on that
     chapter's site rather than on the About page. Scoped, so a coordinator
     reaches their own and nobody else's. */
  campusTeam: { read: [...CAMPUS, "board_member"], write: CAMPUS, remove: CAMPUS, scoped: true },
  impactMetrics: { read: ALL_STAFF, write: DIRECTORS, remove: ADMIN },

  /* ── The network ────────────────────────────────────────────────── */
  chapters: { read: [...CAMPUS, "board_member"], write: COORDINATORS, remove: ADMIN, scoped: true },
  impactReports: { read: [...CAMPUS, "board_member"], write: CAMPUS, remove: ADMIN, scoped: true },

  /* ── People's personal data ─────────────────────────────────────── */
  advocates: { read: [...COORDINATORS, "board_member"], write: COORDINATORS, remove: ADMIN },
  applications: { read: [...COORDINATORS, "board_member"], write: ADMIN, remove: ADMIN },
  enquiries: { read: [...CAMPUS, "board_member"], write: CAMPUS, remove: ADMIN },

  /* ── Administration ─────────────────────────────────────────────── */
  users: { read: ADMIN, write: ADMIN, remove: ADMIN },
  settings: { read: [...ADMIN, "board_member"], write: ADMIN, remove: ADMIN },
  audit: { read: [...ADMIN, "board_member"], write: [], remove: [] },
};

const active = (p?: Profile | null) => !!p && p.status === "active";

export function canRead(p: Profile | null | undefined, area: Area) {
  return active(p) && CAPABILITIES[area].read.includes(p!.role);
}

export function canEdit(p: Profile | null | undefined, area: Area) {
  return active(p) && CAPABILITIES[area].write.includes(p!.role);
}

export function canRemove(p: Profile | null | undefined, area: Area) {
  return active(p) && CAPABILITIES[area].remove.includes(p!.role);
}

/**
 * True when this person's writing is limited to their own chapter.
 *
 * Regional coordinators and above see the whole organisation; below that, a
 * campus coordinator or contributor works inside their own chapter only.
 */
export function isScoped(p: Profile | null | undefined, area: Area) {
  if (!active(p)) return true;
  if (!CAPABILITIES[area].scoped) return false;
  /* Zonal and below work inside their own patch; regional and above see
     the whole organisation. */
  return RANK[p!.role] < RANK.regional_coordinator;
}

/** One line explaining a refusal, for the empty state on a page. */
export function refusalFor(area: Area): string {
  const who = CAPABILITIES[area].read;
  if (who.length === 0) return "Nobody has access to this section.";
  const admin = who.every((r) => r === "super_admin" || r === "admin" || r === "board_member");
  if (admin) return "This section is limited to admins.";
  if (!who.includes("campus_coordinator")) {
    return "This section is limited to directors and admins — it affects the whole organisation, not one chapter.";
  }
  return "Your role does not include this section. If you need it, ask an admin.";
}
