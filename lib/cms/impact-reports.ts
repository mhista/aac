"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";
import { canEdit, canRemove } from "@/lib/auth/capabilities";

/**
 * Impact reports — the evidence behind the numbers.
 *
 * The public site says AAC has reached a certain number of people. This is
 * where that number is supposed to come from: a chapter files what it did,
 * a coordinator above them verifies it, and only verified reports count.
 *
 * The whole project has one rule about figures — never invent one — and this
 * is the machinery that makes the rule keepable rather than merely stated. An
 * unverified report is a claim; a verified one is evidence; the difference is
 * a person who was not the author looking at it.
 */

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

function num(form: FormData, k: string) {
  const v = String(form.get(k) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function str(form: FormData, k: string) {
  const v = form.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createImpactReport(form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canEdit(me, "impactReports")) {
    return { ok: false, error: "Your role does not allow filing impact reports." };
  }

  const title = str(form, "title");
  if (!title) return { ok: false, error: "Give the activity a title — what was it?" };

  const activityDate = str(form, "activity_date");
  if (!activityDate) return { ok: false, error: "When did it happen?" };
  if (activityDate > new Date().toISOString().slice(0, 10)) {
    return {
      ok: false,
      error: "That date is in the future. An impact report records something that has already happened.",
    };
  }

  /* Their own chapter unless they cover several and chose one. */
  const chapterId = str(form, "chapter_id") ?? me.chapter_id ?? null;
  if (!chapterId) {
    return { ok: false, error: "Choose which chapter this belongs to." };
  }

  const { data, error } = await db
    .from("impact_reports")
    .insert({
      title,
      description: str(form, "description"),
      people_reached: num(form, "people_reached"),
      activity_date: activityDate,
      chapter_id: chapterId,
      advocate_id: me.id,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/impact-reports");
  return {
    ok: true,
    id: data.id as string,
    message:
      rank(me) >= 60
        ? "Filed. You can verify it below."
        : "Filed. A coordinator above you verifies it before it counts towards the published figures.",
  };
}

export async function saveImpactReport(id: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const title = str(form, "title");
  if (!title) return { ok: false, error: "A report needs a title." };

  const { error } = await db
    .from("impact_reports")
    .update({
      title,
      description: str(form, "description"),
      people_reached: num(form, "people_reached"),
      activity_date: str(form, "activity_date"),
    })
    .eq("id", id);

  if (error) {
    /* The verification trigger raises its own sentences. */
    if (/verified/i.test(error.message)) return { ok: false, error: error.message };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/impact-reports");
  return { ok: true, message: "Saved." };
}

export async function setReportStatus(id: string, status: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const allowed = ["draft", "submitted", "verified", "rejected"];
  if (!allowed.includes(status)) return { ok: false, error: "Unknown status." };

  if (status === "verified") {
    if (rank(me) < 50) return { ok: false, error: "Only a coordinator can verify a report." };

    /* A verified report with no number verifies nothing. Better to refuse than
       to let a blank count as evidence. */
    const { data } = await db
      .from("impact_reports")
      .select("people_reached,advocate_id")
      .eq("id", id)
      .maybeSingle();

    if (data && data.people_reached === null) {
      return {
        ok: false,
        error: "Add how many people it reached before verifying — that number is what the report is for.",
      };
    }
    if (data && data.advocate_id === me.id && rank(me) < 60) {
      return {
        ok: false,
        error: "You cannot verify your own report. Ask the coordinator above you.",
      };
    }
  }

  const { error } = await db.from("impact_reports").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: `impact_report_${status}`,
    entity_type: "impact_reports",
    entity_id: id,
  });

  revalidatePath("/dashboard/impact-reports");
  revalidatePath("/impact");

  return {
    ok: true,
    message:
      status === "verified" ? "Verified. It now counts towards the published figures."
      : status === "rejected" ? "Sent back. Add a note saying what is missing."
      : status === "submitted" ? "Reopened for review."
      : "Moved back to draft.",
  };
}

export async function deleteImpactReport(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const { data } = await db
    .from("impact_reports")
    .select("status,advocate_id,title")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, error: "That report no longer exists." };

  const mine = data.advocate_id === me.id;
  if (!canRemove(me, "impactReports") && !(mine && data.status === "draft")) {
    return {
      ok: false,
      error:
        data.status === "verified"
          ? "A verified report is evidence for a published figure. Only an admin can delete one, and reopening it is usually what you want."
          : "You can only delete a report you filed and have not submitted.",
    };
  }

  const { error } = await db.from("impact_reports").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/impact-reports");
  return { ok: true, message: "Report deleted." };
}
