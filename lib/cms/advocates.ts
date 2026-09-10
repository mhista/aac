"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";
import { attachCv } from "@/lib/cms/cv";
import {
  AGE_RANGES, COUNTRIES, EXPERIENCE, GENDERS, INTERESTS, INVOLVEMENT, PROFILE_KINDS,
  fieldForHeader, matchOption, splitMulti,
  type AdvocateInput,
} from "@/lib/advocates/form";

/**
 * Advocates — the people who have signed up to be part of AAC.
 *
 * Three jobs: take a registration from the public form, let coordinators work
 * through the list, and bring across the 800-odd responses already sitting in
 * the Google Forms spreadsheets.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ── Public registration ─────────────────────────────────────────────── */

export async function registerAdvocate(form: FormData): Promise<Result> {
  const db = await createClient();
  if (!db) return { ok: false, error: "Registration is unavailable right now. Please try again shortly." };

  const str = (k: string) => String(form.get(k) ?? "").trim();
  const many = (k: string) => form.getAll(k).map((v) => String(v).trim()).filter(Boolean);

  const first_name = str("first_name");
  const last_name = str("last_name");
  const email = str("email").toLowerCase();
  const phone = str("phone");

  if (!first_name || !last_name) return { ok: false, error: "Please give your first and last name." };
  if (!EMAIL.test(email)) return { ok: false, error: "That email address does not look right." };
  if (!phone) return { ok: false, error: "Please give a phone number so a coordinator can reach you." };

  const profile_kind = str("profile_kind");
  if (!PROFILE_KINDS.includes(profile_kind as never)) {
    return { ok: false, error: "Please choose which of the three best describes you." };
  }

  const interests = many("interests").filter((i) => INTERESTS.includes(i as never));
  if (interests.length === 0) {
    return { ok: false, error: "Please choose at least one area you are interested in." };
  }

  const country = COUNTRIES.includes(str("country") as never) ? str("country") : "Nigeria";

  const payload: AdvocateInput = {
    first_name, last_name, email, phone,
    gender: many("gender").filter((g) => GENDERS.includes(g as never)),
    age_range: AGE_RANGES.includes(str("age_range") as never) ? str("age_range") : "",
    country,
    locality: str("locality"),
    profile_kind,
    interests,
    involvement: INVOLVEMENT.includes(str("involvement") as never) ? str("involvement") : "",
    motivation: str("motivation"),
    /* Only the branch that applies. Someone who starts as a student, switches
       to health professional and submits should not carry stale school
       details into the record. */
    school: profile_kind === "Student" ? str("school") : "",
    faculty: profile_kind === "Student" ? str("faculty") : "",
    study_level: profile_kind === "Student" ? str("study_level") : "",
    professional_title: profile_kind === "Health Professional" ? str("professional_title") : "",
    workplace:
      profile_kind === "Health Professional" || profile_kind === "Non-health Volunteer"
        ? str("workplace")
        : "",
    years_experience:
      profile_kind === "Health Professional" && EXPERIENCE.includes(str("years_experience") as never)
        ? str("years_experience")
        : "",
    occupation: profile_kind === "Non-health Volunteer" ? str("occupation") : "",
    consent_updates: form.get("consent_updates") === "on",
  };

  /* Through the function, not a direct insert. A plain insert rejects a
     duplicate email with an error that would tell anybody who tried that the
     address is registered — a membership list is not something a public form
     should be able to be used to read. */
  const { error } = await db.rpc("register_advocate", { payload });

  if (error) {
    if (/valid email/i.test(error.message)) return { ok: false, error: "That email address does not look right." };
    return { ok: false, error: "Something went wrong saving your details. Please try again." };
  }

  /* The CV last, and never fatally.
     The application is already saved by this point, so a file that will not
     upload costs a note rather than the whole submission — which is the right
     trade when the CV is optional and the person is on a phone in Enugu. */
  let note: string | undefined;
  const cv = form.get("cv");
  if (cv instanceof File && cv.size > 0) {
    const res = await attachCv(email, cv);
    note = res.ok ? res.note : `${res.error} You can send it to us later.`;
  }

  revalidatePath("/dashboard/people");
  return {
    ok: true,
    message:
      "You are in. A coordinator will be in touch — and if you gave a campus, whoever runs it will hear from you first." +
      (note ? ` (${note})` : ""),
  };
}

/* ── Working through the list ────────────────────────────────────────── */

export async function setAdvocateStatus(id: string, status: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 50) return { ok: false, error: "Only a coordinator can change an advocate's status." };

  const allowed = ["new", "reviewing", "accepted", "active", "declined", "dormant"];
  if (!allowed.includes(status)) return { ok: false, error: "Unknown status." };

  const { error } = await db
    .from("advocates")
    .update({ status, reviewer_id: me.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/people");
  return { ok: true, message: "Updated." };
}

export async function assignAdvocateChapter(id: string, chapterId: string | null): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 50) return { ok: false, error: "Only a coordinator can attach someone to a chapter." };

  const { error } = await db
    .from("advocates")
    .update({ chapter_id: chapterId || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/people");
  return { ok: true, message: chapterId ? "Attached to that chapter." : "Detached from the chapter." };
}

export async function saveAdvocateNote(id: string, note: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 50) return { ok: false, error: "Only a coordinator can add notes." };

  const { error } = await db.from("advocates").update({ notes: note || null }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/people");
  return { ok: true, message: "Note saved." };
}

export async function deleteAdvocate(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 80) {
    return {
      ok: false,
      error: "Only an admin can delete someone's record. If they asked to be removed, tell an admin.",
    };
  }

  const { error } = await db.from("advocates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id, action: "advocate_deleted", entity_type: "advocates", entity_id: id,
  });

  revalidatePath("/dashboard/people");
  return { ok: true, message: "Record deleted." };
}

/* ── Importing the Google Forms responses ────────────────────────────── */

/**
 * A CSV parser that survives real spreadsheet exports.
 *
 * The motivation field is a paragraph, so it routinely contains commas,
 * quotation marks and line breaks — all three of which break the
 * `split(",")` approach that looks like it works on the first ten rows.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  /* A byte-order mark at the start of a Google export would otherwise become
     part of the first header, so "Timestamp" would never match. */
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }

  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type ImportReport = {
  ok: boolean;
  error?: string;
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  unmatchedColumns: string[];
  matchedColumns: string[];
  problems: string[];
  preview: boolean;
};

/**
 * Read a Google Forms CSV and put the people in it into the database.
 *
 * Runs as a dry run unless `commit` is set, because an import that turns out
 * to have matched the wrong columns is tedious to undo and alarming to
 * discover. The dry run reports exactly which spreadsheet columns were
 * recognised, which were ignored, and how many rows would be new — so the
 * decision to commit is made with the answer already in hand.
 *
 * Existing people are updated rather than duplicated, matched on email.
 */
export async function importAdvocatesCsv(form: FormData): Promise<ImportReport> {
  const empty: ImportReport = {
    ok: false, total: 0, imported: 0, updated: 0, skipped: 0,
    unmatchedColumns: [], matchedColumns: [], problems: [], preview: true,
  };

  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ...empty, error: "You are not signed in." };
  if (rank(me) < 80) return { ...empty, error: "Only an admin can import advocate records." };

  const file = form.get("file");
  const commit = form.get("commit") === "yes";
  const country = String(form.get("country") ?? "Nigeria");
  const source = String(form.get("source") ?? "google_form");

  if (!(file instanceof File) || file.size === 0) {
    return { ...empty, error: "Choose the CSV file you downloaded from Google Sheets." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ...empty, error: "That file is over 8MB. Split it in Google Sheets and import in two parts." };
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    return { ...empty, error: "That file has no rows in it. Download the responses again from Google Sheets — File → Download → Comma-separated values." };
  }

  const headers = rows[0];
  const mapping = headers.map((h) => fieldForHeader(h));
  const matchedColumns: string[] = [];
  const unmatchedColumns: string[] = [];
  headers.forEach((h, i) => {
    const label = h.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!label) return;
    (mapping[i] ? matchedColumns : unmatchedColumns).push(label);
  });

  const emailCol = mapping.findIndex((m) => m?.field === "email");
  if (emailCol === -1) {
    return {
      ...empty,
      error:
        "No email column was found, so there is no way to tell one person from another. Check you downloaded the responses sheet rather than the form itself.",
      unmatchedColumns,
      matchedColumns,
    };
  }

  /* Everyone already here, so the report can distinguish new people from
     corrections to people we have. */
  const { data: existingRows } = await db.from("advocates").select("email").limit(20000);
  const existing = new Set((existingRows ?? []).map((r: any) => String(r.email).toLowerCase()));

  const problems: string[] = [];
  const seen = new Set<string>();
  const records: Record<string, unknown>[] = [];
  let skipped = 0, imported = 0, updated = 0;

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const rec: Record<string, any> = {
      country, source,
      gender: [] as string[], interests: [] as string[],
    };

    headers.forEach((_, i) => {
      const col = mapping[i];
      if (!col) return;
      const raw = (line[i] ?? "").trim();
      if (!raw) return;

      switch (col.field) {
        case "gender": rec.gender = splitMulti(raw, GENDERS); break;
        case "interests": rec.interests = splitMulti(raw, INTERESTS); break;
        case "age_range": rec.age_range = matchOption(raw, AGE_RANGES); break;
        case "profile_kind": rec.profile_kind = matchOption(raw, PROFILE_KINDS); break;
        case "involvement": rec.involvement = matchOption(raw, INVOLVEMENT); break;
        case "years_experience": rec.years_experience = matchOption(raw, EXPERIENCE); break;
        case "submitted_at": {
          const t = Date.parse(raw.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$2-$1"));
          if (!Number.isNaN(t)) rec.submitted_at = new Date(t).toISOString();
          break;
        }
        case "email": {
          /* Two email columns exist: the one Google records automatically and
             the one the form asks for. Keep the first non-empty and do not
             let a later blank overwrite it. */
          if (!rec.email) rec.email = raw.toLowerCase();
          break;
        }
        default: rec[col.field] = raw;
      }
    });

    const email = String(rec.email ?? "").toLowerCase();
    if (!EMAIL.test(email)) {
      skipped++;
      if (problems.length < 12) {
        problems.push(`Row ${r + 1}: no usable email address${email ? ` ("${email.slice(0, 40)}")` : ""} — skipped.`);
      }
      continue;
    }
    if (seen.has(email)) {
      skipped++;
      if (problems.length < 12) problems.push(`Row ${r + 1}: ${email} appears twice in this file — the later answer was kept.`);
      /* Replace the earlier one rather than dropping the newer answer. */
      const at = records.findIndex((x) => x.email === email);
      if (at >= 0) records.splice(at, 1);
    }
    seen.add(email);

    if (!rec.first_name && !rec.last_name) {
      /* A name is required by the table. Fall back to the local part of the
         address rather than losing the person entirely. */
      rec.first_name = email.split("@")[0];
      rec.last_name = "—";
      if (problems.length < 12) problems.push(`Row ${r + 1}: no name given; used the email name instead.`);
    }
    rec.first_name = rec.first_name || "—";
    rec.last_name = rec.last_name || "—";
    rec.email = email;

    if (existing.has(email)) updated++; else imported++;
    records.push(rec);
  }

  const report: ImportReport = {
    ok: true, total: rows.length - 1, imported, updated, skipped,
    matchedColumns, unmatchedColumns, problems, preview: !commit,
  };

  if (!commit) return report;

  /* Committed in batches. One statement with several thousand rows is a long
     transaction that can time out halfway, and a half-applied import is the
     thing this whole flow exists to avoid. */
  const SIZE = 200;
  for (let i = 0; i < records.length; i += SIZE) {
    const batch = records.slice(i, i + SIZE);
    const { error } = await db.from("advocates").upsert(batch, {
      onConflict: "email",
      ignoreDuplicates: false,
    });
    if (error) {
      return {
        ...report,
        ok: false,
        preview: false,
        error: `Saved ${i} of ${records.length} before stopping: ${error.message}. Run the import again — the people already saved will be updated, not duplicated.`,
      };
    }
  }

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "advocates_imported",
    entity_type: "advocates",
    diff: { total: records.length, imported, updated, source, country },
  });

  revalidatePath("/dashboard/people");
  return report;
}
