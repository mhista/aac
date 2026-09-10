"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { INTERESTS, PROFILE_KINDS, COUNTRIES } from "@/lib/advocates/form";
import { inputCls } from "./ui";
import { Search, Close } from "@/components/ui/Icon";

/**
 * Narrowing eight hundred people down to the ones you are working on today.
 *
 * Everything lives in the URL, so a filtered view can be bookmarked, sent to a
 * colleague, and survives the refresh that follows every status change — which
 * matters here more than anywhere else in the dashboard, because working
 * through a list means changing a row and expecting to still be looking at the
 * same list afterwards.
 *
 * "No chapter yet" is given its own button rather than being buried in the
 * chapter menu, because straight after an import it is the only filter anybody
 * wants: everyone who came from Google Forms arrives unattached.
 */

const STATUSES: [string, string][] = [
  ["all", "Everyone"],
  ["new", "New"],
  ["reviewing", "Being reviewed"],
  ["accepted", "Accepted"],
  ["active", "Active"],
  ["declined", "Not taken up"],
  ["dormant", "Dormant"],
];

export function AdvocateFilters({
  status, kind, country, chapter, interest, q, chapters, showChapters,
}: {
  status: string;
  kind: string;
  country: string;
  chapter: string;
  interest: string;
  q: string;
  chapters: { id: string; name: string }[];
  showChapters: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const first = useRef(true);

  const go = (next: Record<string, string | null>) => {
    const merged: Record<string, string> = { status, kind, country, chapter, interest, q, ...(next as any) };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") p.set(k, v);
    }
    const query = p.toString();
    router.push(query ? `/dashboard/people?${query}` : "/dashboard/people");
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => { if (text !== q) go({ q: text || null }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const pill = (on: boolean) =>
    `mono rounded-pill px-3 py-1.5 transition-colors duration-hover ${
      on
        ? "bg-[var(--color-violet-100)] !text-[var(--color-violet-700)]"
        : "border border-[var(--color-border-default)] hover:bg-[var(--color-surface-page-alt)]"
    }`;

  const filtering =
    status !== "all" || kind !== "all" || country !== "all" || chapter !== "all" ||
    interest !== "all" || !!q;

  return (
    <div className="mb-5 space-y-3">
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUSES.map(([v, label]) => (
          <button key={v} type="button" onClick={() => go({ status: v })} className={pill(status === v)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 sm:max-w-[320px]">
          <span className="sr-only">Search by name, email or school</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Name, email or school"
            className={`${inputCls} pl-9`}
          />
        </label>

        <select value={kind} onChange={(e) => go({ kind: e.target.value })} aria-label="Filter by what they are" className={`${inputCls} max-w-[190px]`}>
          <option value="all">Anyone</option>
          {PROFILE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        <select value={country} onChange={(e) => go({ country: e.target.value })} aria-label="Filter by country" className={`${inputCls} max-w-[150px]`}>
          <option value="all">Every country</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={interest} onChange={(e) => go({ interest: e.target.value })} aria-label="Filter by interest" className={`${inputCls} max-w-[240px]`}>
          <option value="all">Any interest</option>
          {INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>

        {showChapters && (
          <select value={chapter} onChange={(e) => go({ chapter: e.target.value })} aria-label="Filter by chapter" className={`${inputCls} max-w-[240px]`}>
            <option value="all">Every chapter</option>
            <option value="none">No chapter yet</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {filtering && (
          <button
            type="button"
            onClick={() => router.push("/dashboard/people")}
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
