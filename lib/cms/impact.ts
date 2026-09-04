"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canEdit, canRemove } from "@/lib/auth/capabilities";

/**
 * Impact figures.
 *
 * These are the numbers the organisation will be judged on, quoted in funding
 * applications and repeated by people who were not in the room when they were
 * counted. The brief was explicit: never invent, and never round 5 up to "5+".
 * So this file enforces three things the interface alone could not:
 *
 * · A published figure needs a methodology note. "800+ advocates" without
 *   "people who completed orientation and are active in a chapter" is a claim,
 *   not a measurement — and in a year nobody will remember which it was.
 *
 * · The displayed text is checked against the number behind it. Writing "5+"
 *   over a value of 5 is the specific inflation the brief warned about, and it
 *   happens by habit, not by intent.
 *
 * · A figure with no number is not an error. "People reached — we are still
 *   building the system to measure this" is an honest state, and the site is
 *   designed to render it. It simply cannot be published as a headline.
 */

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

function slugKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
}

export async function createMetric(): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canEdit(me, "impactMetrics")) {
    return { ok: false, error: "Impact figures are edited by directors and admins." };
  }

  const { data: last } = await db
    .from("impact_metrics")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("impact_metrics")
    .insert({
      key: `new_figure_${Date.now().toString(36)}`,
      label: "New figure",
      position: (last?.position ?? 0) + 1,
      /* Unpublished until somebody has actually filled it in. A blank figure
         appearing on the homepage the moment it is created is exactly the
         demo-data problem this project set out to avoid. */
      is_published: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/impact");
  return { ok: true, id: data.id as string, message: "Added. Fill it in, then publish." };
}

export async function saveMetric(id: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canEdit(me, "impactMetrics")) {
    return { ok: false, error: "Impact figures are edited by directors and admins." };
  }

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const label = str("label");
  if (!label) return { ok: false, error: "A figure needs a label — what is being counted." };

  const displayRaw = str("value_display");
  const numericRaw = str("value_numeric");
  const numeric = numericRaw === null ? null : Number(numericRaw);
  if (numericRaw !== null && !Number.isFinite(numeric)) {
    return { ok: false, error: "The number is not a number." };
  }

  /* The inflation check. "5+" over a value of 5 claims more than was counted;
     the brief called this out by name. Approximation upward is fine when the
     number really is a floor — 800 counted, "800+" shown — but not when they
     are the same. */
  if (displayRaw && numeric !== null) {
    const digits = displayRaw.replace(/[^0-9.]/g, "");
    if (digits && Number(digits) === numeric && /\+/.test(displayRaw)) {
      return {
        ok: false,
        error: `You counted ${numeric} and are showing "${displayRaw}". The plus claims more than you counted — write "${numeric}", or raise the number if there are genuinely more.`,
      };
    }
    if (digits && Number(digits) > numeric) {
      return {
        ok: false,
        error: `You counted ${numeric} but are showing "${displayRaw}". A displayed figure must never be higher than the one behind it.`,
      };
    }
  }

  const { error } = await db
    .from("impact_metrics")
    .update({
      key: str("key") ?? slugKey(label),
      label,
      value_numeric: numeric,
      value_display: displayRaw,
      unit: str("unit"),
      as_of: str("as_of"),
      methodology_note: str("methodology_note"),
      is_headline: form.get("is_headline") === "on",
      position: Number(str("position") ?? "0") || 0,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Another figure already uses that key." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/impact");
  revalidatePath("/");
  revalidatePath("/impact");
  return { ok: true, message: "Saved." };
}

export async function setMetricPublished(id: string, next: boolean): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canEdit(me, "impactMetrics")) {
    return { ok: false, error: "Impact figures are edited by directors and admins." };
  }

  if (next) {
    const { data } = await db
      .from("impact_metrics")
      .select("label,value_display,value_numeric,methodology_note,is_headline")
      .eq("id", id)
      .single();

    if (!data) return { ok: false, error: "That figure no longer exists." };
    if (!data.value_display && data.value_numeric === null) {
      return {
        ok: false,
        error: "There is no figure to publish yet. Leave it unpublished — the site shows a “not yet measured” state rather than a blank.",
      };
    }
    if (!data.methodology_note) {
      return {
        ok: false,
        error: "Add a methodology note first. A number without an explanation of how it was counted is a claim, and in a year nobody will remember which it was.",
      };
    }
  }

  const { error } = await db.from("impact_metrics").update({ is_published: next }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/impact");
  revalidatePath("/");
  revalidatePath("/impact");
  return {
    ok: true,
    message: next ? "Published. It is live on the site." : "Hidden from the site.",
  };
}

export async function deleteMetric(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canRemove(me, "impactMetrics")) {
    return { ok: false, error: "Only an admin can delete a figure." };
  }

  const { error } = await db.from("impact_metrics").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/impact");
  revalidatePath("/");
  return { ok: true, message: "Deleted." };
}
