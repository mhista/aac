"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";
import { isEmailConfigured, sendBatch } from "@/lib/email/send";
import { SITE } from "@/lib/seo";
import { ORG } from "@/lib/org";
import { BATCH_SIZE, INTEREST_LABEL, WAITLIST_STATUSES, type WaitlistRow } from "./shared";

/**
 * Waitlist administration.
 *
 * Everything here re-checks rank server-side. RLS refuses anyway; this layer
 * exists so a person gets a sentence instead of a Postgres error.
 *
 * The batch send is deliberately capped per press (`BATCH_SIZE`). Two reasons:
 * a serverless function has a wall-clock limit and a 400-person send at two a
 * second would hit it, and a capped batch is resumable — if something fails
 * halfway, the rows already emailed are marked, and pressing Send again picks
 * up exactly where it stopped rather than emailing anyone twice.
 */

type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

/* ── Reading ─────────────────────────────────────────────────────── */

export async function listWaitlist(filter?: {
  interest?: string;
  status?: string;
}): Promise<WaitlistRow[]> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile || rank(profile) < 50) return [];

  let q = db
    .from("application_waitlist")
    .select(
      "id,interest,full_name,email,country,institution,note,status,notified_at,notify_count,unsubscribed_at,unsubscribe_token,last_error,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (filter?.interest && filter.interest !== "all") q = q.eq("interest", filter.interest);
  if (filter?.status && filter.status !== "all") q = q.eq("status", filter.status);

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as WaitlistRow[];
}

/* ── The open / closed switch ────────────────────────────────────── */

export async function setApplicationsOpen(open: boolean): Promise<AdminResult> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (rank(profile) < 80) {
    return { ok: false, error: "Only an admin can open or close applications." };
  }

  const { data: current } = await db
    .from("site_settings")
    .select("feature_flags")
    .eq("id", 1)
    .single();

  const flags = { ...(current?.feature_flags ?? {}), applications_open: open };

  const { error } = await db.from("site_settings").update({ feature_flags: flags }).eq("id", 1);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: profile.id,
    action: open ? "applications_opened" : "applications_closed",
    entity_type: "site_settings",
    entity_id: null,
  });

  /* Every page carrying an ApplyPanel changes state, so clear the lot. */
  revalidatePath("/", "layout");
  revalidatePath("/dashboard/applications");
  return {
    ok: true,
    message: open
      ? "Applications are open. The country forms are live on the site."
      : "Applications are closed. The site is collecting names for the waitlist.",
  };
}

export async function setClosedNote(note: string): Promise<AdminResult> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (rank(profile) < 80) return { ok: false, error: "Only an admin can change this." };

  const { data: current } = await db
    .from("site_settings")
    .select("feature_flags")
    .eq("id", 1)
    .single();

  const trimmed = note.trim();
  const flags = {
    ...(current?.feature_flags ?? {}),
    applications_closed_note: trimmed === "" ? null : trimmed.slice(0, 400),
  };

  const { error } = await db.from("site_settings").update({ feature_flags: flags }).eq("id", 1);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/dashboard/applications");
  return { ok: true, message: "Saved." };
}

/* ── Triage ──────────────────────────────────────────────────────── */

export async function setWaitlistStatus(id: string, status: string): Promise<AdminResult> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (rank(profile) < 50) return { ok: false, error: "Your role does not allow this." };

  if (!(WAITLIST_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status." };

  const { error } = await db.from("application_waitlist").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/applications");
  return { ok: true };
}

/* ── The batch email ─────────────────────────────────────────────── */

function defaultBody(interest: string) {
  const what = INTEREST_LABEL[interest] ?? "applications";
  return (
    `Applications for the ${what} programme are now open.\n\n` +
    `You asked us to let you know, so here it is — before we announce it anywhere else.\n\n` +
    `Apply here: ${SITE}/get-involved\n\n` +
    `If you have questions before you start, reply to this email or write to ${ORG.email.general}.\n\n` +
    `— ${ORG.name}`
  );
}

/**
 * Email the people waiting on one list.
 *
 * Sends to at most BATCH_SIZE people who have not already been notified for
 * this round, marks each row as it goes, and reports how many are left. Anyone
 * unsubscribed, marked spam or declined is excluded by the query, not by a
 * filter someone might forget to apply.
 */
export async function notifyWaitlist(
  interest: string,
  subject: string,
  body: string
): Promise<AdminResult> {
  const db = await createClient();
  const profile = await getProfile();
  if (!db || !profile) return { ok: false, error: "You are not signed in." };
  if (rank(profile) < 80) {
    return { ok: false, error: "Only an admin can email the waitlist." };
  }
  if (!isEmailConfigured()) {
    return {
      ok: false,
      error:
        "No email provider is configured yet. Set RESEND_API_KEY and EMAIL_FROM, or export the list as CSV and send from your own mail client.",
    };
  }
  if (!subject.trim()) return { ok: false, error: "The email needs a subject line." };

  let q = db
    .from("application_waitlist")
    .select("id,full_name,email,unsubscribe_token,notify_count")
    .is("unsubscribed_at", null)
    .is("notified_at", null)
    .not("status", "in", "(spam,declined)")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE + 1);

  if (interest !== "all") q = q.eq("interest", interest);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };

  const all = data ?? [];
  if (all.length === 0) {
    return { ok: true, message: "Everybody on this list has already been emailed." };
  }

  const batch = all.slice(0, BATCH_SIZE);
  const more = all.length > BATCH_SIZE;
  const text = body.trim() || defaultBody(interest);

  const { sent, failed } = await sendBatch(
    batch,
    (r: any) => ({
      to: r.email,
      subject: subject.trim(),
      replyTo: ORG.email.general,
      text:
        `Hello ${String(r.full_name).split(" ")[0]},\n\n` +
        `${text}\n\n` +
        `---\n` +
        `You are receiving this because you asked to be told when applications open.\n` +
        `Unsubscribe: ${SITE}/unsubscribe/${r.unsubscribe_token}\n`,
    }),
    async (r: any, result) => {
      if (result.ok) {
        await db
          .from("application_waitlist")
          .update({
            notified_at: new Date().toISOString(),
            notify_count: (r.notify_count ?? 0) + 1,
            status: "notified",
            last_error: null,
          })
          .eq("id", r.id);
      } else {
        /* Record the failure but leave notified_at null, so pressing Send
           again retries this person rather than skipping them. */
        await db
          .from("application_waitlist")
          .update({ last_error: result.error.slice(0, 300) })
          .eq("id", r.id);
      }
    }
  );

  await db.from("audit_log").insert({
    actor_id: profile.id,
    action: "waitlist_notified",
    entity_type: "application_waitlist",
    entity_id: null,
    diff: { interest, subject: subject.trim(), sent, failed },
  });

  revalidatePath("/dashboard/applications");

  const parts = [`${sent} email${sent === 1 ? "" : "s"} sent.`];
  if (failed) parts.push(`${failed} failed — those rows keep their error and will retry.`);
  if (more) parts.push(`More are waiting. Press Send again to continue.`);
  return { ok: true, message: parts.join(" ") };
}
