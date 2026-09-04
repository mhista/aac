"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { INTERESTS, CONSENT_TEXT, type Interest } from "./shared";

/**
 * Application waitlist — the public write path.
 *
 * When applications are closed the site no longer shows a dead end. It takes
 * a name, an email and a country, and AAC emails everyone on the list in a
 * batch when an intake opens.
 *
 * Design notes:
 *
 * · The consent sentence the person actually saw is stored on the row. If
 *   someone later asks why they were emailed, the answer is in the record,
 *   not in a developer's memory.
 * · A duplicate submission returns success and writes nothing. It must not
 *   report "you are already on this list" — that would turn the form into an
 *   oracle for checking whether a given email address signed up.
 * · A honeypot field catches the bots that fill in every input. Real people
 *   never see it, so anything in it is discarded silently, as a success.
 */

type WaitlistResult = { ok: true } | { ok: false; error: string };

/** Deliberately permissive: it rejects typos, not unusual addresses. */
function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
}

function clean(form: FormData, key: string, max: number) {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return s === "" ? null : s.slice(0, max);
}

export async function joinWaitlist(form: FormData): Promise<WaitlistResult> {
  /* Honeypot. Named plausibly so a bot fills it, hidden so a person cannot. */
  if (typeof form.get("company") === "string" && (form.get("company") as string).length > 0) {
    return { ok: true };
  }

  const interestRaw = clean(form, "interest", 20) ?? "other";
  const interest = (INTERESTS as readonly string[]).includes(interestRaw)
    ? (interestRaw as Interest)
    : "other";

  const fullName = clean(form, "full_name", 120);
  const emailRaw = clean(form, "email", 254);
  const consented = form.get("consent") === "on" || form.get("consent") === "true";

  if (!fullName) return { ok: false, error: "Please tell us your name." };
  if (!emailRaw) return { ok: false, error: "Please give us an email address we can reach you on." };

  const email = emailRaw.toLowerCase();
  if (!looksLikeEmail(email)) {
    return { ok: false, error: "That email address does not look right — please check it." };
  }
  if (!consented) {
    return { ok: false, error: "Please tick the box so we know you want us to email you." };
  }

  const db = await createClient();
  if (!db) {
    return { ok: false, error: "We could not save that just now. Please try again in a moment." };
  }

  let path: string | null = null;
  try {
    const h = await headers();
    path = h.get("referer");
  } catch {
    /* Header access can fail in some rendering contexts; provenance is
       useful, not essential. Never fail a submission over it. */
  }

  const { error } = await db.from("application_waitlist").insert({
    interest,
    full_name: fullName,
    email,
    country: clean(form, "country", 80),
    phone: clean(form, "phone", 40),
    institution: clean(form, "institution", 160),
    note: clean(form, "note", 400),
    source_path: path,
    consent_text: CONSENT_TEXT,
  });

  if (error) {
    /* 23505 = unique violation: they are already on this list. Say the same
       thing we say to a first-time signup. */
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: "We could not save that just now. Please try again in a moment." };
  }

  return { ok: true };
}

/** Public unsubscribe, called from /unsubscribe/[token]. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const db = await createClient();
  if (!db) return false;
  const { data, error } = await db.rpc("waitlist_unsubscribe", { p_token: token });
  if (error) return false;
  return data === true;
}
