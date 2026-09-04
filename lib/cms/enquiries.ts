"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";

/* Kept local: a "use server" module may export only async functions. */
const STATUSES = ["new", "read", "actioned", "spam"] as const;

/**
 * The enquiry inbox.
 *
 * Statuses are for AAC's own coordination, not for the sender — nobody is
 * notified when a message is marked answered. The point is that with several
 * people able to open this list, "answered" is how the second person knows not
 * to reply as well.
 *
 * Enquiries are never edited, only triaged. What somebody wrote is a record.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function setEnquiryStatus(id: string, status: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 50) return { ok: false, error: "Your role does not allow this." };
  if (!(STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Unknown status." };
  }

  const { error } = await db.from("form_submissions").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/enquiries");
  return { ok: true };
}

export async function deleteEnquiry(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 80) {
    return {
      ok: false,
      error: "Only an admin can delete an enquiry. Mark it as spam instead — that hides it without destroying the record.",
    };
  }

  const { error } = await db.from("form_submissions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "enquiry_deleted",
    entity_type: "form_submissions",
    entity_id: id,
  });

  revalidatePath("/dashboard/enquiries");
  return { ok: true, message: "Deleted." };
}
