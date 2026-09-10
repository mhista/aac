"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";
import { extractCvText } from "@/lib/cv/extract";
import { summariseCv } from "@/lib/cv/summarise";

/**
 * CVs.
 *
 * Optional on the application, private in storage, and never a gate: a CV that
 * will not upload or will not parse must not cost somebody their application.
 * Everything here fails soft and says what happened.
 */

const BUCKET = "advocate-cvs";
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "text/plain": "txt",
};

const BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
};

export type CvResult =
  | { ok: true; note?: string }
  | { ok: false; error: string };

/**
 * Store a CV against an advocate, and read what text there is.
 *
 * Called from the public application, where the person is anonymous — so the
 * write goes through the service-role client rather than granting the bucket a
 * policy that anybody on the internet could post into. Validation happens
 * before that key is used, not after.
 *
 * `email` identifies the row rather than an id, because the application uses
 * an upsert and the caller does not know the id.
 */
export async function attachCv(email: string, file: File): Promise<CvResult> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "File storage is not configured on this deployment, so the CV was not saved.",
    };
  }

  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That file is over 5MB. A PDF of a CV is usually well under 1MB." };
  }

  /* Browsers lie about MIME types often enough — an empty string, or
     application/octet-stream from a phone — that the extension is checked as
     well and either one being recognised is enough. */
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const byMime = ALLOWED[file.type];
  const byExt = BY_EXTENSION[ext] ? ext : undefined;
  if (!byMime && !byExt) {
    return { ok: false, error: "Please attach a PDF or a Word document." };
  }
  const kind = byMime ?? byExt!;
  const contentType = byMime ? file.type : BY_EXTENSION[byExt!];

  const buffer = await file.arrayBuffer();

  /* A path nobody can guess. The email is not in it: bucket paths turn up in
     logs and error messages, and an address is personal data. */
  const stamp = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  const path = `${stamp}-${rand}.${kind}`;

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (upErr) {
    if (/bucket not found/i.test(upErr.message)) {
      return { ok: false, error: "The CV storage area does not exist yet — migration 016 has not run." };
    }
    return { ok: false, error: "The CV could not be saved. Everything else was." };
  }

  const extracted = await extractCvText({ buffer, type: contentType, name: file.name });

  const { error: rowErr } = await admin
    .from("advocates")
    .update({
      cv_path: path,
      cv_filename: file.name.slice(0, 160),
      cv_uploaded_at: new Date().toISOString(),
      cv_text: extracted.text || null,
      cv_summary: null,
      cv_parsed_at: null,
    })
    .eq("email", email.toLowerCase());

  if (rowErr) {
    /* The file is stored but nothing points at it. Record it so it can be
       swept rather than sitting in the bucket forever. */
    await admin.from("storage_orphans").insert({ bucket: BUCKET, path }).select().maybeSingle();
    return { ok: false, error: "The CV was uploaded but could not be attached to your application." };
  }

  revalidatePath("/dashboard/people");
  return { ok: true, note: extracted.note };
}

/**
 * A link to read one CV, good for fifteen minutes.
 *
 * The reach check is here rather than in a storage policy because a policy
 * cannot express "the coordinator whose chapter this advocate belongs to".
 * RLS on `advocates` does the checking: if the reader cannot select the row,
 * they never learn the path, and no link is minted.
 */
export async function getCvLink(advocateId: string): Promise<
  { ok: true; url: string; filename: string } | { ok: false; error: string }
> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 50) {
    return { ok: false, error: "Only a coordinator can open somebody's CV." };
  }

  /* Read through the ordinary client, so RLS decides whether this person may
     see this advocate at all. */
  const { data, error } = await db
    .from("advocates")
    .select("cv_path,cv_filename,first_name,last_name")
    .eq("id", advocateId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "That record is not available to you." };
  if (!data.cv_path) return { ok: false, error: "There is no CV on this record." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "File storage is not configured on this deployment." };

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(data.cv_path, 900, {
      download: data.cv_filename ?? `${data.first_name}-${data.last_name}.pdf`,
    });

  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: "The file could not be opened. It may have been removed." };
  }

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "cv_opened",
    entity_type: "advocates",
    entity_id: advocateId,
  });

  return {
    ok: true,
    url: signed.signedUrl,
    filename: data.cv_filename ?? "cv",
  };
}

/**
 * Read a stored CV into fields.
 *
 * On demand rather than on upload, deliberately. Doing it during the
 * application would add several seconds to the moment somebody presses Join,
 * for a result nobody is waiting on — and if Groq were down, it would look
 * like the application had failed.
 */
export async function parseCv(advocateId: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 50) return { ok: false, error: "Only a coordinator can do this." };

  const { data, error } = await db
    .from("advocates")
    .select("cv_text,cv_path")
    .eq("id", advocateId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "That record is not available to you." };
  if (!data.cv_path) return { ok: false, error: "There is no CV on this record." };
  if (!data.cv_text) {
    return {
      ok: false,
      error: "No text could be read from this CV — it is probably a scan. Open the file instead.",
    };
  }

  const result = await summariseCv(data.cv_text);
  if (!result.ok) return { ok: false, error: result.error };

  const { error: saveErr } = await db
    .from("advocates")
    .update({ cv_summary: result.summary, cv_parsed_at: new Date().toISOString() })
    .eq("id", advocateId);

  if (saveErr) return { ok: false, error: saveErr.message };

  revalidatePath("/dashboard/people");
  return {
    ok: true,
    message: result.summary.empty
      ? "Nothing could be read from it. The file is still there to open."
      : "Read. Check it against the file before relying on it.",
  };
}

/** Remove a CV — an erasure request, or a file sent by mistake. */
export async function removeCv(advocateId: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 80) return { ok: false, error: "Only an admin can delete a CV." };

  const { data } = await db.from("advocates").select("cv_path").eq("id", advocateId).maybeSingle();
  if (!data?.cv_path) return { ok: false, error: "There is no CV on this record." };

  const admin = createAdminClient();
  if (admin) await admin.storage.from(BUCKET).remove([data.cv_path]);

  const { error } = await db
    .from("advocates")
    .update({
      cv_path: null, cv_filename: null, cv_uploaded_at: null,
      cv_text: null, cv_summary: null, cv_parsed_at: null,
    })
    .eq("id", advocateId);

  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id, action: "cv_deleted", entity_type: "advocates", entity_id: advocateId,
  });

  revalidatePath("/dashboard/people");
  return { ok: true, message: "CV deleted." };
}
