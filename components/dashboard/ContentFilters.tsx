"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { inputCls, STATUS } from "./ui";
import { Search, Close } from "@/components/ui/Icon";

/**
 * Finding one thing among many.
 *
 * Events and articles were a flat list, which was fine at twenty rows and
 * stops being fine the moment forty chapters are each posting. So: filter by
 * status, filter by chapter, and search by name — all in the URL, so a filtered
 * view can be bookmarked, shared with a colleague, and survives the page
 * refresh that follows every save.
 *
 * The chapter menu only appears for people who can see more than one chapter.
 * Offering a campus coordinator a filter with exactly one option in it would be
 * asking them to make a choice that has already been made for them.
 *
 * Search is debounced rather than instant: typing "screening" at one request
 * per keystroke is nine queries to show one answer.
 */

export type ChapterOpt = { id: string; name: string };

const STATUSES = ["all", "draft", "in_review", "changes_requested", "published"] as const;

export function ContentFilters({
  base,
  status,
  chapter,
  q,
  featured,
  chapters,
  showFeatured,
  showAac,
}: {
  /** "/dashboard/events" */
  base: string;
  status: string;
  chapter: string;
  q: string;
  featured: boolean;
  chapters: ChapterOpt[];
  /** Only admins and content leads curate the main site. */
  showFeatured: boolean;
  /**
   * Whether to offer "AAC — not a chapter". A coordinator's remit is chapters;
   * offering them a filter for national content they cannot reach would return
   * an empty list and read as a bug.
   */
  showAac: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const first = useRef(true);

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { status, chapter, q, featured: featured ? "1" : "", ...next };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") p.set(k, v);
    }
    const query = p.toString();
    router.push(query ? `${base}?${query}` : base);
  };

  /* Debounce the search box, and skip the first run so arriving on the page
     does not immediately push a duplicate history entry. */
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (text !== q) go({ q: text || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const pill = (on: boolean) =>
    `mono rounded-pill px-3 py-1.5 transition-colors duration-hover ${
      on
        ? "bg-[var(--color-violet-100)] !text-[var(--color-violet-700)]"
        : "border border-[var(--color-border-default)] hover:bg-[var(--color-surface-page-alt)]"
    }`;

  const filtering = status !== "all" || chapter !== "all" || !!q || featured;

  return (
    <div className="mb-5 space-y-3">
      <nav aria-label="Filter by status" className="flex flex-wrap items-center gap-2">
        {STATUSES.map((f) => (
          <button key={f} type="button" onClick={() => go({ status: f })} className={pill(status === f)}>
            {f === "all" ? "All" : STATUS[f]?.label ?? f}
          </button>
        ))}

        {showFeatured && (
          <button
            type="button"
            onClick={() => go({ featured: featured ? null : "1" })}
            className={pill(featured)}
            title="Only entries chosen for the main AAC site"
          >
            On the main site
          </button>
        )}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 sm:max-w-[340px]">
          <span className="sr-only">Search by title</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by title"
            className={`${inputCls} pl-9`}
          />
        </label>

        {chapters.length > 1 && (
          <label className="flex items-center gap-2">
            <span className="sr-only">Filter by chapter</span>
            <select
              value={chapter}
              onChange={(e) => go({ chapter: e.target.value })}
              className={`${inputCls} max-w-[260px]`}
            >
              <option value="all">{showAac ? "Everything" : "Every chapter"}</option>
              {showAac && <option value="aac">AAC — not a chapter</option>}
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {filtering && (
          <button
            type="button"
            onClick={() => router.push(base)}
            className="mono inline-flex min-h-[36px] items-center gap-1.5 rounded-pill border border-[var(--color-border-default)] px-3 hover:bg-[var(--color-surface-page-alt)]"
          >
            <Close className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
