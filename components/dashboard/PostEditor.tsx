"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  savePost, submitPostForReview, publishPost, unpublishPost,
  requestPostChanges, deletePost,
} from "@/lib/cms/posts";
import { Markdown, readingMinutes } from "@/lib/markdown";
import { MediaUploader } from "./MediaUploader";
import { Field, inputCls, BTN, StatusPill, Notice } from "./ui";
import { ArrowLeft } from "@/components/ui/Icon";
import type { Profile } from "@/lib/auth/permissions";

/**
 * Article editor.
 *
 * One long form rather than the event editor's four steps, because writing is
 * not a checklist — an author moves between the body, the summary and the
 * title constantly, and paging between them would be hostile.
 *
 * Write and Preview are tabs over the same field. The preview uses the exact
 * component the public page uses, so what an author sees is what publishes;
 * a preview that only approximates the real thing is worse than none, because
 * it is trusted and wrong.
 */

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  status: string;
  category_slug: string | null;
  tags: string[] | null;
  cover: { url: string; alt: string } | null;
  medically_reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
};

const MARKDOWN_HELP = [
  ["## Heading", "a section heading"],
  ["**bold**  *italic*", "emphasis"],
  ["- item", "a bullet list"],
  ["1. item", "a numbered list"],
  ["> quote", "a pulled-out quote"],
  ["[text](https://…)", "a link"],
  ["![description](https://…)", "an image — paste a link from the media library"],
] as const;

export function PostEditor({
  post,
  categories,
  profile,
  canPublishNow,
}: {
  post: Post;
  categories: { slug: string; name: string }[];
  profile: Profile;
  canPublishNow: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [body, setBody] = useState(post.body ?? "");

  /* Same guard as the event editor. The fields here do not unmount — this is
     one form and the body lives in state — but an article is the longest thing
     anyone writes in this dashboard, so losing it to a closed tab is the worst
     possible outcome. */
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [cover, setCover] = useState(post.cover?.url ?? "");
  const [note, setNote] = useState("");
  const [armed, setArmed] = useState(false);

  const readOnly = post.status === "in_review" && !canPublishNow;
  const isPublic = post.status === "published" || post.status === "scheduled";

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string } | void>) =>
    start(async () => {
      const res = await fn();
      if (res && !res.ok) setMsg({ ok: false, text: res.error ?? "That did not work." });
      else {
        if (res && res.message) setMsg({ ok: true, text: res.message });
        setDirty(false);
      }
      router.refresh();
    });

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/blog" className="mono mb-3 inline-flex items-center gap-1.5 hover:text-[var(--color-text-primary)]">
            <ArrowLeft className="h-3.5 w-3.5" /> All articles
          </Link>
          <h1 className="font-display text-[clamp(1.4rem,1.2rem+1vw,2rem)] text-[var(--color-text-display)]">
            {post.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={post.status} />
          {isPublic && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="mono hover:text-[var(--color-text-primary)]">
              View live
            </a>
          )}
        </div>
      </div>

      {msg && <div className="mb-5"><Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice></div>}

      {post.status === "changes_requested" && (
        <div className="mb-5">
          <Notice tone="warning" title="A reviewer asked for changes">
            Look at what they flagged, make the edits, then submit it again.
          </Notice>
        </div>
      )}

      {readOnly && (
        <div className="mb-5">
          <Notice tone="info" title="With a reviewer">
            This is being reviewed, so it is locked. Ask your reviewer to send it back if you need
            to change something.
          </Notice>
        </div>
      )}

      <form
        action={(fd) => {
          fd.set("body", body);
          fd.set("cover_url", cover);
          run(() => savePost(post.id, fd));
        }}
        onInput={() => setDirty(true)}
        className="space-y-5"
      >
        <fieldset disabled={readOnly} className="space-y-5">
          <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5">
            <Field label="Title" htmlFor="title" required>
              <input id="title" name="title" defaultValue={post.title} className={inputCls} />
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Web address"
                htmlFor="slug"
                hint={
                  isPublic
                    ? "Frozen once published — changing it would break every existing link to this article."
                    : "The last part of the URL. Keep it short and readable."
                }
              >
                <input
                  id="slug"
                  name="slug"
                  defaultValue={post.slug}
                  disabled={isPublic}
                  className={inputCls}
                />
              </Field>

              <Field label="Category" htmlFor="cat" required>
                <select id="cat" name="category_slug" defaultValue={post.category_slug ?? ""} className={inputCls}>
                  <option value="">Choose one</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <Field
                label="Short summary"
                htmlFor="excerpt"
                required
                hint="Two sentences. This is what shows on the blog index, in a search result and when the link is shared — so it is the sentence most people will read."
              >
                <textarea id="excerpt" name="excerpt" rows={2} defaultValue={post.excerpt ?? ""} className={inputCls} />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Tags" htmlFor="tags" hint="Comma separated. Optional.">
                <input id="tags" name="tags" defaultValue={post.tags?.join(", ") ?? ""} className={inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Body ─────────────────────────────────────────────── */}
          <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white">
            <div className="flex items-center gap-1 border-b border-[var(--color-border-subtle)] px-3 py-2">
              {(["write", "preview"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={`mono rounded-dash-sm px-3 py-1.5 transition-colors ${
                    tab === t
                      ? "bg-[var(--color-violet-100)] !text-[var(--color-violet-700)]"
                      : "hover:bg-[var(--color-surface-page-alt)]"
                  }`}
                >
                  {t === "write" ? "Write" : "Preview"}
                </button>
              ))}
              <span className="mono ml-auto">
                {body.trim() ? `${readingMinutes(body)} min read` : "empty"}
              </span>
            </div>

            {tab === "write" ? (
              <div className="p-5">
                <label htmlFor="body" className="sr-only">Article body</label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={22}
                  placeholder="Write the article here…"
                  className={`${inputCls} font-mono text-[13px] leading-relaxed`}
                />
                <details className="mt-4">
                  <summary className="mono cursor-pointer">Formatting</summary>
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-[auto_1fr]">
                    {MARKDOWN_HELP.map(([code, what]) => (
                      <div key={code} className="contents">
                        <dt className="font-mono text-[var(--color-text-primary)]">{code}</dt>
                        <dd className="text-[var(--color-text-secondary)]">{what}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
            ) : (
              <div className="p-5">
                {body.trim() ? (
                  <div className="mx-auto max-w-[68ch] text-[15px] leading-relaxed">
                    <Markdown>{body}</Markdown>
                  </div>
                ) : (
                  <p className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Cover ────────────────────────────────────────────── */}
          <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5">
            <p className="mono mb-3">Cover image</p>
            {cover ? (
              <div className="mb-4 flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="h-28 w-44 rounded-dash-sm object-cover" />
                <div className="min-w-[220px] flex-1">
                  <Field
                    label="Describe the cover"
                    htmlFor="cover_alt"
                    required
                    hint="For someone who cannot see it. Required before this can go for review."
                  >
                    <input
                      id="cover_alt"
                      name="cover_alt"
                      defaultValue={post.cover?.alt ?? ""}
                      className={inputCls}
                    />
                  </Field>
                  <button type="button" onClick={() => setCover("")} className={`${BTN.ghost} mt-2`}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <MediaUploader
                folder="/blog"
                accept="image/*"
                label="Add a cover image"
                hint="Shown on the blog index and when the article is shared. Landscape works best."
                onUploaded={(r) => setCover(r.url)}
              />
            )}
          </div>

          {/* ── Medical review ───────────────────────────────────── */}
          <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5">
            <Field
              label="Medically reviewed by"
              htmlFor="rev"
              hint="The clinician who checked this for accuracy — name and qualification, e.g. “Dr Okhesomi Eshemokhai, MBChB”. Leave empty for articles that make no medical claims."
            >
              <input
                id="rev"
                name="medically_reviewed_by"
                defaultValue={post.medically_reviewed_by ?? ""}
                className={inputCls}
                placeholder="Dr Name, qualification"
              />
            </Field>
            <p className="mt-3 max-w-[70ch] text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              Naming a reviewer marks the page as reviewed health information rather than opinion,
              which is how search engines are told to treat it — and how a reader knows a person
              qualified to check it did. Never fill this in with somebody who has not read it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={BTN.primary}>
              {pending ? "Saving…" : "Save"}
            </button>
            {dirty && (
              <span className="mono self-center text-[var(--color-feedback-warning-text)]">
                Unsaved changes
              </span>
            )}
            {!isPublic && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => submitPostForReview(post.id))}
                className={BTN.secondary}
              >
                Submit for review
              </button>
            )}
          </div>
        </fieldset>
      </form>

      {/* ── Reviewer controls ──────────────────────────────────── */}
      {canPublishNow && (
        <div className="mt-6 rounded-dash-md border border-[var(--color-border-default)] bg-[var(--color-surface-page-alt)] p-5">
          <p className="mono mb-3">Reviewing</p>
          <div className="flex flex-wrap gap-2">
            {!isPublic ? (
              <button type="button" disabled={pending} onClick={() => run(() => publishPost(post.id))} className={BTN.primary}>
                Publish to the site
              </button>
            ) : (
              <button type="button" disabled={pending} onClick={() => run(() => unpublishPost(post.id))} className={BTN.secondary}>
                Take off the site
              </button>
            )}
          </div>

          {post.status === "in_review" && (
            <div className="mt-4">
              <Field label="Send it back with a note" htmlFor="note" hint="Say what needs changing. A bare rejection is not useful.">
                <textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
              </Field>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => requestPostChanges(post.id, note))}
                className={`${BTN.secondary} mt-3`}
              >
                Request changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Danger zone ────────────────────────────────────────── */}
      <div className="mt-10 rounded-dash-md border border-[var(--color-feedback-danger-base)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Delete this article</p>
            <p className="mt-1 max-w-[60ch] text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              {isPublic
                ? "It will disappear from the site immediately and its web address will stop working — including from any search result or newsletter that links to it."
                : "It has never been public, so nothing outside the dashboard changes."}
            </p>
          </div>
          {!armed && (
            <button type="button" onClick={() => setArmed(true)} className={BTN.danger}>Delete</button>
          )}
        </div>
        {armed && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deletePost(post.id))}
              className={BTN.danger}
            >
              Yes, delete “{post.title}” permanently
            </button>
            <button type="button" onClick={() => setArmed(false)} className={BTN.ghost}>Keep it</button>
          </div>
        )}
      </div>
    </div>
  );
}
