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

/**
 * Give a chapter its coordinator, from the chapter itself.
 *
 * The coordinator was previously only settable from Users & roles, which
 * meant creating a chapter and staffing it were two screens and two mental
 * steps — and the step people forgot was the second one, leaving chapters on
 * the public site with nobody reading their enquiries.
 *
 * Two ways in, because both are real. Sometimes the person already has an
 * account and you are moving them; sometimes they are a student you met last
 * week and all you have is an email address. Either way this ends with one
 * named person attached to this chapter.
 *
 * `replace` is required to displace a sitting coordinator, and it is a
 * deliberate second act rather than something that happens quietly: the
 * database holds one active campus coordinator per chapter, and the person
 * being replaced does not stop existing — they are moved to Advocate and
 * unattached, which is reversible from Users & roles.
 */
export async function assignCoordinator(form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 80) {
    return { ok: false, error: "Only an admin can attach a coordinator to a chapter." };
  }

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const chapterId = str("chapter_id");
  if (!chapterId) return { ok: false, error: "No chapter was given." };

  const userId = str("user_id");
  const email = str("email")?.toLowerCase();
  const replace = form.get("replace") === "yes";

  if (!userId && !email) {
    return { ok: false, error: "Choose someone who already has an account, or type an email address to invite." };
  }

  const { data: chapter } = await db
    .from("chapters")
    .select("university,name")
    .eq("id", chapterId)
    .maybeSingle();
  const where = (chapter as any)?.name || (chapter as any)?.university || "this chapter";

  /* Who is sitting in the seat now. The index only binds active coordinators,
     so this mirrors it exactly. */
  const { data: sitting } = await db
    .from("profiles")
    .select("id,full_name,email")
    .eq("chapter_id", chapterId)
    .eq("role", "campus_coordinator")
    .eq("status", "active")
    .maybeSingle();

  if (sitting && sitting.id !== userId) {
    if (!replace) {
      const who = (sitting as any).full_name || (sitting as any).email;
      return {
        ok: false,
        error: `${who} is already the coordinator for ${where}. Use Replace if they are handing over — they will be moved to Advocate, which you can undo in Users & roles.`,
      };
    }
    const { error: demote } = await db.rpc("set_user_role", {
      p_user: (sitting as any).id,
      p_role: "advocate",
      p_chapter: null,
      p_region: null,
      p_department: null,
      p_zone: null,
    });
    if (demote) {
      return { ok: false, error: say(demote, "Could not move the current coordinator out of the role.") };
    }
  }

  /* An existing account: change their role directly. */
  if (userId) {
    const { error } = await db.rpc("set_user_role", {
      p_user: userId,
      p_role: "campus_coordinator",
      p_chapter: chapterId,
      p_region: null,
      p_department: null,
      p_zone: null,
    });
    if (error) {
      if (error.code === "23505" || /already has a campus coordinator/i.test(error.message)) {
        return { ok: false, error: `${where} already has a coordinator. Refresh and try Replace.` };
      }
      return { ok: false, error: say(error, "Could not give that person the role.") };
    }
    revalidatePath("/dashboard/chapters");
    revalidatePath("/dashboard/users");
    return { ok: true, message: `Attached to ${where}.` };
  }

  /* Only an email: the shared invite path, which already handles the case
     where that address turns out to have an account after all. */
  const invite = new FormData();
  invite.set("email", email!);
  invite.set("role", "campus_coordinator");
  invite.set("chapter_id", chapterId);
  const full = str("full_name");
  if (full) invite.set("full_name", full);

  const res = await inviteUser(invite);
  if (res.ok) revalidatePath("/dashboard/chapters");
  return res;
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
