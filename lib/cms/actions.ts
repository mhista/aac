"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canPublish, canWrite, atLeast } from "@/lib/auth/permissions";
import { getSession, NOT_SIGNED_IN, formReader, type ActionResult, slugify, uniqueSlug, findBlankDraft } from "@/lib/cms/shared";
import { youTubeId, youTubeWatch } from "@/lib/media/youtube";

/**
 * Event server actions.
 *
 * Every one of these re-checks permission server-side before touching data.
 * RLS would refuse anyway — this layer exists so the person gets a sentence
 * explaining why, instead of an opaque database error.
 *
 * Publishing deliberately does NOT update `status` directly. It calls the
 * publish_content() RPC, which checks rank, snapshots the row into `revisions`
 * and writes `audit_log` atomically. A coordinator who tries it gets refused by
 * Postgres, not by a hidden button.
 */

export async function createEvent(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;
  if (!canWrite(profile)) {
    return { ok: false, error: "Your role does not allow creating events." };
  }

  /* Reopen an untouched blank draft rather than piling up another one. */
  const blank = await findBlankDraft(db, "events", profile.id, "Untitled event", [
    "body", "subtitle", "starts_at", "venue", "cover",
  ]);
  if (blank) return { ok: true, id: blank };

  const slug = await uniqueSlug(db, "events", `untitled-${Date.now().toString(36)}`);
  const { data, error } = await db
    .from("events")
    .insert({
      title: "Untitled event",
      slug,
      status: "draft",
      chapter_id: profile.chapter_id,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/events");
  return { ok: true, id: data.id as string };
}

/**
 * Create a draft and open it — the form-action version of createEvent.
 *
 * This exists because creating a row must happen on a POST, never on a render.
 * The old /dashboard/events/new route created the draft while rendering, which
 * Next refuses (revalidatePath during render) and which was wrong anyway: a
 * link prefetch, a refresh or a back-button press each minted another
 * "Untitled event". A form submit happens once, when a person presses it.
 */
export async function createEventAndOpen(): Promise<void> {
  const result = await createEvent();
  if (!result.ok) {
    redirect(`/dashboard/events?error=${encodeURIComponent(result.error)}`);
  }
  if (!result.id) {
    redirect(`/dashboard/events?error=${encodeURIComponent("The event was not created.")}`);
  }
  redirect(`/dashboard/events/${result.id}`);
}

export async function saveEvent(id: string, form: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;
  if (!canWrite(profile)) return { ok: false, error: "Your role does not allow editing." };

  const { str, num, ts } = formReader(form);

  const title = str("title") ?? "Untitled event";
  const wantedSlug = str("slug");
  const slug = await uniqueSlug(db, "events", slugify(wantedSlug ?? title), { ignoreId: id });

  const { error } = await db
    .from("events")
    .update({
      title,
      slug,
      subtitle: str("subtitle"),
      event_type: str("event_type"),
      body: str("body"),
      venue: str("venue"),
      city: str("city"),
      country: str("country"),
      starts_at: ts("starts_at"),
      ends_at: ts("ends_at"),
      attendance: num("attendance"),
      screenings_done: num("screenings_done"),
      materials_distributed: num("materials_distributed"),
      updated_by: profile.id,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
  return { ok: true, id };
}

/**
 * Submit for review — the coordinator's path to publication.
 *
 * Gated on the same things a reviewer would check first, so nobody submits
 * something that will only bounce back.
 */
export async function submitForReview(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;

  const { data: ev } = await db
    .from("events")
    .select("title,starts_at,city,country,body")
    .eq("id", id)
    .single();

  if (!ev) return { ok: false, error: "Event not found." };

  const missing: string[] = [];
  if (!ev.title || ev.title === "Untitled event") missing.push("a title");
  if (!ev.starts_at) missing.push("a date");
  if (!ev.city && !ev.country) missing.push("a location");
  if (!ev.body) missing.push("a recap");

  if (missing.length) {
    return {
      ok: false,
      error: `Before this can go for review it needs ${missing.join(", ")}.`,
    };
  }

  const { data: photos } = await db
    .from("event_media")
    .select("id,alt")
    .eq("event_id", id);

  const noAlt = (photos ?? []).filter((p: any) => !p.alt?.trim()).length;
  if (noAlt > 0) {
    return {
      ok: false,
      error: `${noAlt === 1 ? "One photograph or video" : `${noAlt} photographs or videos`} in the gallery still ${noAlt === 1 ? "needs" : "need"} a description. Every one needs a short description so people using a screen reader know what it shows.`,
    };
  }

  const { error } = await db
    .from("events")
    .update({ status: "in_review", updated_by: profile.id })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: profile.id,
    action: "submit_for_review",
    entity_type: "events",
    entity_id: id,
  });

  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
  return { ok: true, id };
}

export async function publishEvent(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;
  if (!canPublish(profile)) {
    return {
      ok: false,
      error: "Only a regional coordinator, director, admin or content lead can publish. Submit it for review instead.",
    };
  }

  const { error } = await db.rpc("publish_content", {
    p_table: "events",
    p_id: id,
    p_status: "published",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/events");
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${id}`);
  return { ok: true, id };
}

/** Send it back with a reason. The reason is the whole point. */
export async function requestChanges(id: string, note: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;
  if (!atLeast(profile, "regional_coordinator")) return { ok: false, error: "Only a reviewer can request changes." };
  if (!note.trim()) return { ok: false, error: "Please say what needs changing — a bare rejection is not useful." };

  const { error } = await db
    .from("events")
    .update({ status: "changes_requested", updated_by: profile.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: profile.id,
    action: "request_changes",
    entity_type: "events",
    entity_id: id,
    diff: { note },
  });

  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
  return { ok: true, id };
}

/**
 * Delete an event, in any state.
 *
 * Who may do what is enforced by RLS (007_event_delete.sql): coordinators and
 * above can remove anything including published events; everyone else only
 * their own, and only while it has never been public. This function's job is
 * to explain a refusal in a sentence and to leave a record — a published event
 * disappearing without a trace is not acceptable, because its URL may be
 * linked from a partner's site or a funding application.
 *
 * Attached photographs cascade. The files themselves stay in the media
 * library, because they may be used elsewhere.
 */
/** Delete several events at once, reporting what went and what did not. */
export async function deleteManyEvents(ids: string[]): Promise<ActionResult> {
  if (!ids.length) return { ok: false, error: "Nothing selected." };

  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;

  let gone = 0;
  const refusals: string[] = [];

  for (const id of ids) {
    const { data: ev } = await db
      .from("events")
      .select("title,slug,status,created_by,chapter_id")
      .eq("id", id)
      .single();
    if (!ev) continue;

    const isPublic = ev.status === "published" || ev.status === "scheduled";
    const mine = ev.created_by === profile.id || ev.chapter_id === profile.chapter_id;

    if (!atLeast(profile, "regional_coordinator")) {
      if (isPublic) { refusals.push("published events need a coordinator to remove."); continue; }
      if (!mine || !atLeast(profile, "contributor")) { refusals.push("you can only delete your own chapter's events."); continue; }
    }

    await db.from("audit_log").insert({
      actor_id: profile.id,
      action: "event_deleted",
      entity_type: "events",
      entity_id: id,
      diff: { title: ev.title, slug: ev.slug, status: ev.status },
    });

    const { error } = await db.from("events").delete().eq("id", id);
    if (error) refusals.push("the database refused it.");
    else gone++;
  }

  revalidatePath("/events");
  revalidatePath("/dashboard/events");

  if (gone === 0) return { ok: false, error: refusals[0] ?? "Nothing could be deleted." };

  const unique = Array.from(new Set(refusals));
  return {
    ok: true,
    id: `${gone} deleted.` + (unique.length ? ` ${refusals.length} left alone — ${unique[0]}` : ""),
  };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;

  const { data: ev } = await db
    .from("events")
    .select("title,slug,status,created_by,chapter_id")
    .eq("id", id)
    .single();

  if (!ev) return { ok: false, error: "That event has already been deleted." };

  const mine = ev.created_by === profile.id || ev.chapter_id === profile.chapter_id;
  const isPublic = ev.status === "published" || ev.status === "scheduled";

  /* Mirrors the RLS rule so the person gets a sentence, not a silent no-op.
     Postgres still refuses independently. */
  if (!atLeast(profile, "regional_coordinator")) {
    if (isPublic) {
      return {
        ok: false,
        error: "This event is live on the website. Ask a regional coordinator or an admin to remove it.",
      };
    }
    if (!mine || !atLeast(profile, "contributor")) {
      return { ok: false, error: "You can only delete events from your own chapter." };
    }
  }

  /* Recorded before the delete: afterwards the row is gone and there is
     nothing left to describe it. */
  await db.from("audit_log").insert({
    actor_id: profile.id,
    action: "event_deleted",
    entity_type: "events",
    entity_id: id,
    diff: { title: ev.title, slug: ev.slug, status: ev.status },
  });

  const { error } = await db.from("events").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error: "The database refused that deletion. Your role may not allow removing this event.",
    };
  }

  revalidatePath("/dashboard/events");
  revalidatePath("/events");
  if (ev.slug) revalidatePath(`/events/${ev.slug}`);
  redirect("/dashboard/events?deleted=1");
}

/* ── Photographs ─────────────────────────────────────────────────── */

export async function addEventPhoto(
  eventId: string,
  photo: { url: string; alt: string; caption?: string | null }
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me: profile } = session;
  if (!photo.url?.trim()) return { ok: false, error: "A photograph needs a URL." };

  const { count } = await db
    .from("event_media")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await db.from("event_media").insert({
    event_id: eventId,
    url: photo.url.trim(),
    alt: photo.alt?.trim() || "",
    caption: photo.caption ?? null,
    position: count ?? 0,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

/**
 * Add a YouTube video to an event's gallery.
 *
 * Videos are never uploaded here — they go to AAC's YouTube channel and the
 * gallery holds the link. It is stored in the same table as photographs, in
 * the same order, with the same required description, so an event's
 * pictures and films read as one gallery. The link is normalised to the
 * ordinary watch address whatever form was pasted, so every row looks alike.
 */
export async function addEventVideo(eventId: string, link: string): Promise<ActionResult> {
  const id = youTubeId(link);
  if (!id) {
    return {
      ok: false,
      error:
        "That does not look like a YouTube link. On YouTube, press Share under the video, copy the link and paste it here.",
    };
  }
  return addEventPhoto(eventId, { url: youTubeWatch(id), alt: "" });
}

export async function updateEventPhoto(
  photoId: string,
  eventId: string,
  patch: { alt?: string; caption?: string | null; position?: number }
): Promise<ActionResult> {
  const db = await createClient();
  if (!db) return { ok: false, error: "You are not signed in." };
  const { error } = await db.from("event_media").update(patch).eq("id", photoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

export async function deleteEventPhoto(photoId: string, eventId: string): Promise<ActionResult> {
  const db = await createClient();
  if (!db) return { ok: false, error: "You are not signed in." };
  const { error } = await db.from("event_media").delete().eq("id", photoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}
