"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canWrite } from "@/lib/auth/permissions";
import { canRemove } from "@/lib/auth/capabilities";

/**
 * The media library.
 *
 * Every upload anywhere in the dashboard is recorded here, not only uploads
 * made from the library screen. That is deliberate: a coordinator adding
 * photographs to an event is also, without thinking about it, building the
 * shared library — and a picture used on an event page can then be reused on a
 * programme page without anyone hunting for the original file.
 *
 * `alt_text` is NOT NULL in the schema, so a row can exist with an empty
 * string but never with nothing. The empty string is the "needs describing"
 * state, which the library surfaces as a filter and a count. Alt text is
 * required before content ships, not before a file lands — asking someone to
 * describe thirty photographs before any of them upload is how you get thirty
 * photographs described as "photo".
 */

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string };

export interface AssetInput {
  url: string;
  fileId?: string;
  filename?: string;
  mime?: string;
  width?: number;
  height?: number;
  size?: number;
  folder?: string;
}

function kindOf(mime?: string) {
  if (!mime) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "document";
}

/** Called by MediaUploader after every successful upload, everywhere. */
export async function recordAsset(input: AssetInput): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canWrite(me)) return { ok: false, error: "Your role does not allow uploading." };
  if (!input.url) return { ok: false, error: "That upload did not return a file." };

  /* An upload retried after a dropped connection can land twice. Match on the
     ImageKit file id so the library does not fill with duplicates. */
  if (input.fileId) {
    const { data: dupe } = await db
      .from("media_assets")
      .select("id")
      .eq("imagekit_file_id", input.fileId)
      .maybeSingle();
    if (dupe) return { ok: true, id: dupe.id };
  }

  const { data, error } = await db
    .from("media_assets")
    .insert({
      kind: kindOf(input.mime),
      url: input.url,
      imagekit_file_id: input.fileId ?? null,
      imagekit_path: input.url,
      filename: input.filename ?? null,
      mime_type: input.mime ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      size_bytes: input.size ?? null,
      folder: input.folder ?? null,
      alt_text: "",
      uploaded_by: me.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/media");
  return { ok: true, id: data.id as string };
}

export async function updateAsset(id: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canWrite(me)) return { ok: false, error: "Your role does not allow this." };

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const { error } = await db
    .from("media_assets")
    .update({
      alt_text: str("alt_text") ?? "",
      caption: str("caption"),
      credit: str("credit"),
      consent_on_file: form.get("consent_on_file") === "on",
      tags: (str("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/media");
  return { ok: true, message: "Saved." };
}

/**
 * Delete a file for good — from the library and from ImageKit.
 *
 * Refuses while anything still points at it. A photograph vanishing from a
 * published event page because someone tidied the library is the kind of
 * damage nobody notices for months.
 */
export async function deleteAsset(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canRemove(me, "media")) return { ok: false, error: "Only an admin can delete a file." };

  const { data: asset } = await db
    .from("media_assets")
    .select("id,url,imagekit_file_id")
    .eq("id", id)
    .single();
  if (!asset) return { ok: false, error: "That file is already gone." };

  const { count } = await db
    .from("media_usage")
    .select("*", { count: "exact", head: true })
    .eq("asset_id", id);

  const { count: eventUses } = await db
    .from("event_media")
    .select("*", { count: "exact", head: true })
    .eq("url", asset.url);

  const uses = (count ?? 0) + (eventUses ?? 0);
  if (uses > 0) {
    return {
      ok: false,
      error: `This is used in ${uses} place${uses === 1 ? "" : "s"}. Remove it there first — deleting it now would leave a hole on a published page.`,
    };
  }

  /* Remove from ImageKit before the row, so a failure leaves a record we can
     still find rather than an orphaned file nobody knows about. */
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (asset.imagekit_file_id && key) {
    try {
      const res = await fetch(`https://api.imagekit.io/v1/files/${asset.imagekit_file_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        },
      });
      /* 404 means it is already gone, which is the outcome we wanted. */
      if (!res.ok && res.status !== 404) {
        return { ok: false, error: `ImageKit refused the delete (${res.status}). Nothing was removed.` };
      }
    } catch {
      return { ok: false, error: "Could not reach ImageKit. Nothing was removed." };
    }
  }

  const { error } = await db.from("media_assets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "media_deleted",
    entity_type: "media_assets",
    entity_id: id,
    diff: { url: asset.url },
  });

  revalidatePath("/dashboard/media");
  return { ok: true, message: "Deleted from the library and from storage." };
}
