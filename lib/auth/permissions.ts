/**
 * The permission model, mirrored from 002_rls.sql.
 *
 * This exists to decide what the UI renders. It is NOT the security boundary —
 * Postgres RLS is. If these two ever disagree, the database wins and the user
 * sees an error instead of silent data loss, which is the correct failure mode.
 */

export type Role =
  | "super_admin" | "board_member" | "admin" | "department_director"
  | "regional_coordinator" | "zonal_coordinator" | "campus_coordinator" | "content_lead"
  | "contributor" | "advocate" | "viewer";

export const RANK: Record<Role, number> = {
  super_admin: 100, board_member: 90, admin: 80, department_director: 70,
  regional_coordinator: 60, zonal_coordinator: 55, campus_coordinator: 50, content_lead: 40,
  contributor: 35, advocate: 30, viewer: 10,
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  board_member: "Board member",
  admin: "Admin",
  department_director: "Department director",
  regional_coordinator: "Regional coordinator",
  zonal_coordinator: "Zonal coordinator",
  campus_coordinator: "Campus coordinator",
  content_lead: "Content lead",
  contributor: "Contributor",
  advocate: "Advocate",
  viewer: "Viewer",
};

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Role;
  chapter_id: string | null;
  zone_id: string | null;
  region_id: string | null;
  department_id: string | null;
  status: "invited" | "active" | "suspended" | "alumni";
}

export const rank = (p?: Profile | null) =>
  p && p.status === "active" ? RANK[p.role] ?? 0 : 0;

/** Board members read everything and write nothing — by design. */
export const canWrite = (p?: Profile | null) =>
  !!p && p.role !== "board_member" && rank(p) >= 35;

export const canPublish = (p?: Profile | null) =>
  !!p && (rank(p) >= 60 || p.role === "content_lead");

export const canManageUsers = (p?: Profile | null) => rank(p) >= 80;
export const canSeeCrm      = (p?: Profile | null) => rank(p) >= 50;
export const canSeeSettings = (p?: Profile | null) => rank(p) >= 80;
export const canSeeAudit    = (p?: Profile | null) => rank(p) >= 80;

/** Anyone below contributor has no dashboard to speak of. */
export const canUseDashboard = (p?: Profile | null) => rank(p) >= 35;

/** Events a coordinator may edit: their own chapter, and only pre-publish. */
export function canEditEvent(
  p: Profile | null | undefined,
  ev: { chapter_id: string | null; created_by: string | null; status: string }
) {
  if (!p) return false;
  if (rank(p) >= 70) return true;
  if (rank(p) >= 60 && ev.chapter_id === p.chapter_id) return true;
  return ev.created_by === p.id && ["draft", "changes_requested"].includes(ev.status);
}
