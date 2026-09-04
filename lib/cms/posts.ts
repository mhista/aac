"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canPublish, canWrite, rank } from "@/lib/auth/permissions";

/**
 * Blog posts.
 *
 * Same shape as the event manager — draft, review, publish through the RPC —
 * with three things specific to writing:
 *
 * · MEDICAL REVIEW. An article about cancer that nobody clinically qualified
 *   has read is a liability, not content. When a reviewer is named, the page's
 *   structured data becomes MedicalWebPage rather than plain Article, which is
 *   what lets search engines treat it as reviewed health information. It is
 *   not mandatory — a chapter's account of a screening day needs no clinician
 *   — but submit-for-review asks about it rather than letting it be forgotten.
 *
 * · EXCERPT AS THE SEO DESCRIPTION. Rather than a separate meta field nobody
 *   fills in, the excerpt does both jobs, so it is always written.
 *
 * · SLUG STABILITY. Once a post is published its slug is frozen. Changing it
 *   silently breaks every existing link to the article — from a partner's
 *   site, a newsletter, a search result — for a cosmetic gain.
 */

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function uniqueSlug(db: any, base: string, ignoreId?: string) {
  const root = base || "post";
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    let q = db.from("posts").select("id").eq("slug", candidate).limit(1);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data } = await q;
    if (!data || data.length === 0) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function createPost(): Promise<void> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me || !canWrite(me)) {
    redirect("/dashboard/blog?error=" + encodeURIComponent("Your role does not allow writing posts."));
  }

  const slug = await uniqueSlug(db, `untitled-${Date.now().toString(36)}`);
  const { data, error } = await db
    .from("posts")
    .insert({
      title: "Untitled post",
      slug,
      status: "draft",
      author_id: me.id,
      author: { full_name: me.full_name ?? me.email, role_title: null, photo: null },
      chapter_id: me.chapter_id,
      created_by: me.id,
      updated_by: me.id,
    })
    .select("id")
    .single();

  if (error) redirect("/dashboard/blog?error=" + encodeURIComponent(error.message));
  redirect(`/dashboard/blog/${data.id}`);
}

export async function savePost(id: string, form: FormData): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canWrite(me)) return { ok: false, error: "Your role does not allow editing." };

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const { data: current } = await db.from("posts").select("status,slug").eq("id", id).single();
  if (!current) return { ok: false, error: "That post no longer exists." };

  const title = str("title") ?? "Untitled post";
  const body = str("body");

  /* Frozen once public. See the note at the top of this file. */
  const locked = current.status === "published" || current.status === "scheduled";
  const slug = locked
    ? current.slug
    : await uniqueSlug(db, slugify(str("slug") ?? title), id);

  const reviewer = str("medically_reviewed_by");
  const excerpt = str("excerpt");

  const { error } = await db
    .from("posts")
    .update({
      title,
      slug,
      excerpt,
      body,
      category_slug: str("category_slug"),
      tags: (str("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      read_minutes: body ? Math.max(1, Math.round(body.trim().split(/\s+/).length / 220)) : null,
      medically_reviewed_by: reviewer,
      /* Stamped when a reviewer is first named, cleared when removed — a
         review date with no reviewer is worse than neither. */
      reviewed_at: reviewer ? new Date().toISOString() : null,
      cover: str("cover_url")
        ? { url: str("cover_url"), alt: str("cover_alt") ?? title }
        : null,
      seo: { description: excerpt ?? undefined },
      updated_by: me.id,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/blog/${id}`);
  revalidatePath("/dashboard/blog");
  if (locked) revalidatePath(`/blog/${slug}`);
  return { ok: true, message: locked ? "Saved. The live article is updated." : "Saved." };
}

/** The blockers a reviewer would raise anyway, surfaced before submitting. */
export async function submitPostForReview(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const { data: p } = await db
    .from("posts")
    .select("title,excerpt,body,category_slug,cover")
    .eq("id", id)
    .single();
  if (!p) return { ok: false, error: "Post not found." };

  const missing: string[] = [];
  if (!p.title || p.title === "Untitled post") missing.push("a title");
  if (!p.excerpt) missing.push("a short summary");
  if (!p.body || p.body.trim().length < 200) missing.push("more than a couple of sentences");
  if (!p.category_slug) missing.push("a category");
  if (p.cover && !(p.cover as any)?.alt?.trim()) missing.push("alt text on the cover image");

  if (missing.length) {
    return { ok: false, error: `Before this goes for review it needs ${missing.join(", ")}.` };
  }

  const { error } = await db
    .from("posts")
    .update({ status: "in_review", updated_by: me.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "submit_for_review",
    entity_type: "posts",
    entity_id: id,
  });

  revalidatePath(`/dashboard/blog/${id}`);
  revalidatePath("/dashboard/blog");
  return { ok: true, message: "Sent for review." };
}

export async function publishPost(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canPublish(me)) {
    return { ok: false, error: "Only a coordinator, director, admin or content lead can publish. Submit it for review instead." };
  }

  const { data: p } = await db.from("posts").select("slug,published_at").eq("id", id).single();

  const { error } = await db.rpc("publish_content", {
    p_table: "posts",
    p_id: id,
    p_status: "published",
  });
  if (error) return { ok: false, error: error.message };

  /* The RPC sets status; first publication also needs a date, which is what
     the article page and the sitemap order by. */
  if (p && !p.published_at) {
    await db.from("posts").update({ published_at: new Date().toISOString() }).eq("id", id);
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${p?.slug}`);
  revalidatePath("/dashboard/blog");
  revalidatePath(`/dashboard/blog/${id}`);
  return { ok: true, message: "Published. It is live on the site." };
}

export async function unpublishPost(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (!canPublish(me)) return { ok: false, error: "Only a reviewer can unpublish." };

  const { data: p } = await db.from("posts").select("slug").eq("id", id).single();

  const { error } = await db.from("posts").update({ status: "draft", updated_by: me.id }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "unpublished",
    entity_type: "posts",
    entity_id: id,
  });

  revalidatePath("/blog");
  if (p?.slug) revalidatePath(`/blog/${p.slug}`);
  revalidatePath("/dashboard/blog");
  return { ok: true, message: "Taken off the site. Its address now returns not-found." };
}

export async function requestPostChanges(id: string, note: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };
  if (rank(me) < 60) return { ok: false, error: "Only a reviewer can request changes." };
  if (!note.trim()) return { ok: false, error: "Please say what needs changing — a bare rejection is not useful." };

  const { error } = await db
    .from("posts")
    .update({ status: "changes_requested", updated_by: me.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "request_changes",
    entity_type: "posts",
    entity_id: id,
    diff: { note },
  });

  revalidatePath(`/dashboard/blog/${id}`);
  revalidatePath("/dashboard/blog");
  return { ok: true, message: "Sent back with your note." };
}

/**
 * Delete several at once.
 *
 * Reports what happened rather than stopping at the first refusal: selecting
 * six and being told "one of these is published" while the other five are
 * silently untouched is the worst of both outcomes. Each is attempted, and the
 * summary says how many went and why the rest did not.
 */
export async function deleteManyPosts(ids: string[]): Promise<Result> {
  if (!ids.length) return { ok: false, error: "Nothing selected." };

  let gone = 0;
  const refusals: string[] = [];

  for (const id of ids) {
    const res = await deleteOnePost(id);
    if (res.ok) gone++;
    else refusals.push(res.error);
  }

  revalidatePath("/blog");
  revalidatePath("/dashboard/blog");

  if (gone === 0) {
    return { ok: false, error: refusals[0] ?? "Nothing could be deleted." };
  }

  const unique = Array.from(new Set(refusals));
  return {
    ok: true,
    message:
      `${gone} deleted.` +
      (unique.length ? ` ${refusals.length} left alone — ${unique[0]}` : ""),
  };
}

/** The body of a single delete, without the redirect. */
async function deleteOnePost(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const { data: p } = await db
    .from("posts")
    .select("title,slug,status,created_by,chapter_id")
    .eq("id", id)
    .single();
  if (!p) return { ok: false, error: "It was already deleted." };

  const isPublic = p.status === "published" || p.status === "scheduled";
  const mine = p.created_by === me.id || p.chapter_id === me.chapter_id;

  if (rank(me) < 60) {
    if (isPublic) return { ok: false, error: "published articles need a coordinator to remove." };
    if (!mine || rank(me) < 35) return { ok: false, error: "you can only delete your own drafts." };
  }

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "post_deleted",
    entity_type: "posts",
    entity_id: id,
    diff: { title: p.title, slug: p.slug, status: p.status },
  });

  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) return { ok: false, error: "the database refused it." };
  return { ok: true };
}

export async function deletePost(id: string): Promise<Result> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { ok: false, error: "You are not signed in." };

  const { data: p } = await db
    .from("posts")
    .select("title,slug,status,created_by,chapter_id")
    .eq("id", id)
    .single();
  if (!p) return { ok: false, error: "That post has already been deleted." };

  const isPublic = p.status === "published" || p.status === "scheduled";
  const mine = p.created_by === me.id || p.chapter_id === me.chapter_id;

  if (rank(me) < 60) {
    if (isPublic) {
      return { ok: false, error: "This article is live. Ask a coordinator or an admin to remove it." };
    }
    if (!mine || rank(me) < 35) {
      return { ok: false, error: "You can only delete your own drafts." };
    }
  }

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "post_deleted",
    entity_type: "posts",
    entity_id: id,
    diff: { title: p.title, slug: p.slug, status: p.status },
  });

  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "The database refused that deletion. Your role may not allow it." };
  }

  revalidatePath("/blog");
  revalidatePath("/dashboard/blog");
  redirect("/dashboard/blog?deleted=1");
}
