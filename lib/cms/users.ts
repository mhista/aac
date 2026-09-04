"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { RANK, ROLE_LABEL, rank, type Role } from "@/lib/auth/permissions";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { SITE } from "@/lib/seo";
import { ORG } from "@/lib/org";

/**
 * People and roles.
 *
 * The guards that matter — no privilege escalation, no self-lockout — live in
 * Postgres (006_invitations.sql), not here. This layer exists to turn the
 * database's exceptions into sentences a person can act on, and to send the
 * invitation email.
 *
 * Roles are assigned by an admin, never requested. There is no "request
 * access" flow, because the failure mode of one is an admin approving
 * something they did not read.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Postgres raises these as plain messages; they are already human-readable. */
function say(error: { message?: string } | null, fallback: string) {
  const m = error?.message ?? "";
  if (!m) return fallback;
  if (m.includes("cannot") || m.includes("Only an admin") || m.includes("does not exist")) {
    return m.replace(/^.*?:\s*/, "");
  }
  return fallback;
}

export async function inviteUser(form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 80) return { ok: false, error: "Only an admin can invite people." };

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const email = str("email")?.toLowerCase();
  const role = (str("role") ?? "advocate") as Role;
  const fullName = str("full_name");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: "That email address does not look right." };
  }
  if (!(role in RANK)) return { ok: false, error: "Unknown role." };

  /* Mirrors the database guard, so the person gets a sentence rather than a
     Postgres exception. The database still refuses independently. */
  if (RANK[role] >= RANK[me.role]) {
    return {
      ok: false,
      error: `You cannot invite someone as ${ROLE_LABEL[role]} — that is at or above your own level.`,
    };
  }

  /* Someone may already have signed in as an advocate before being given a
     real role. In that case there is no new-user trigger to fire, so set the
     role directly instead of leaving an invitation that never applies. */
  const { data: existing } = await db
    .from("profiles")
    .select("id,role")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await db.rpc("set_user_role", {
      p_user: existing.id,
      p_role: role,
      p_chapter: str("chapter_id"),
      p_region: str("region_id"),
      p_department: str("department_id"),
      p_zone: str("zone_id"),
    });
    if (error) return { ok: false, error: say(error, "Could not update that person's role.") };
    revalidatePath("/dashboard/users");
    return { ok: true, message: `${email} already had an account — their role is now ${ROLE_LABEL[role]}.` };
  }

  const { error } = await db.from("invitations").insert({
    email,
    full_name: fullName,
    role,
    chapter_id: str("chapter_id"),
    zone_id: str("zone_id"),
    region_id: str("region_id"),
    department_id: str("department_id"),
    invited_by: me.id,
  });
  if (error) return { ok: false, error: error.message };

  let note = "They get their role automatically the first time they sign in.";
  if (isEmailConfigured()) {
    const sent = await sendEmail({
      to: email,
      subject: `You have been given access to the ${ORG.shortName} dashboard`,
      replyTo: ORG.email.general,
      text:
        `${fullName ? `Hello ${fullName.split(" ")[0]},\n\n` : "Hello,\n\n"}` +
        `${me.full_name ?? "An administrator"} has given you access to the ${ORG.name} dashboard as ${ROLE_LABEL[role]}.\n\n` +
        `To get in, go to ${SITE}/login and enter this email address — ${email}. ` +
        `You will be emailed a sign-in link and a six-digit code; either one works. There is no password to set up.\n\n` +
        `Use this exact address, because your access is attached to it.\n\n` +
        `If you were not expecting this, you can ignore the message — nothing happens until you sign in.\n\n` +
        `— ${ORG.name}`,
    });
    note = sent.ok
      ? "They have been emailed instructions."
      : "The invitation is saved, but the email did not send — tell them to sign in at /login with that address.";
  } else {
    note =
      "No email provider is configured, so nothing was sent — tell them to sign in at /login with that exact address.";
  }

  revalidatePath("/dashboard/users");
  return { ok: true, message: `Invited ${email} as ${ROLE_LABEL[role]}. ${note}` };
}

export async function setUserRole(userId: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const role = (str("role") ?? "advocate") as Role;
  if (!(role in RANK)) return { ok: false, error: "Unknown role." };

  const { error } = await db.rpc("set_user_role", {
    p_user: userId,
    p_role: role,
    p_chapter: str("chapter_id"),
    p_region: str("region_id"),
    p_department: str("department_id"),
    p_zone: str("zone_id"),
  });
  if (error) return { ok: false, error: say(error, "Could not change that role.") };

  revalidatePath("/dashboard/users");
  return { ok: true, message: `Updated. They are now ${ROLE_LABEL[role]}.` };
}

export async function setUserStatus(
  userId: string,
  status: "active" | "suspended" | "alumni"
): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const { error } = await db.rpc("set_user_status", { p_user: userId, p_status: status });
  if (error) return { ok: false, error: say(error, "Could not change their access.") };

  revalidatePath("/dashboard/users");
  return {
    ok: true,
    message:
      status === "suspended"
        ? "Suspended. They can still sign in, but the dashboard will refuse them."
        : status === "alumni"
          ? "Marked as alumni. Their past work stays credited."
          : "Reactivated.",
  };
}

export async function revokeInvitation(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 80) return { ok: false, error: "Only an admin can do that." };

  const { error } = await db
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/users");
  return { ok: true, message: "Invitation revoked. Signing in will no longer grant that role." };
}
