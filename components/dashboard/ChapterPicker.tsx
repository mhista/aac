"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "@/components/ui/Icon";

/**
 * Which chapter am I looking at?
 *
 * This started as a bare `<select>` tucked in the corner of the page header,
 * shown only when there was more than one chapter to choose between. Two
 * things were wrong with that.
 *
 * It was invisible. An unlabelled select against a white page header does not
 * read as a control, so people did not know the screen could show anything
 * else — and with one chapter it was hidden entirely, which meant the first
 * time a second chapter appeared, a control materialised that nobody had ever
 * seen.
 *
 * So it is now always shown, always labelled "Chapter", and looks like
 * something you press. With one chapter it is inert but still visible, because
 * naming which chapter you are editing is worth saying even when there is no
 * choice to make — especially on a screen where publishing puts somebody's
 * face on a website.
 *
 * Above eight chapters it grows a search box. Forty universities in a native
 * dropdown is a scroll, and the names are long and similar.
 */

type Chapter = { id: string; name: string };

const SEARCH_FROM = 8;

export function ChapterPicker({
  chapters,
  selected,
  label = "Chapter",
}: {
  chapters: Chapter[];
  selected: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);

  const current = chapters.find((c) => c.id === selected) ?? chapters[0];
  const only = chapters.length <= 1;
  const searchable = chapters.length >= SEARCH_FROM;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters.filter((c) => c.name.toLowerCase().includes(needle));
  }, [chapters, q]);

  /* Close on an outside click or Escape. Both, because either one alone
     leaves a way to get stuck with the menu open. */
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) searchBox.current?.focus();
    if (!open) setQ("");
  }, [open, searchable]);

  const choose = (id: string) => {
    setOpen(false);
    const next = new URLSearchParams(params.toString());
    next.set("chapter", id);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-2.5">
      <span className="mono shrink-0">{label}</span>

      <div ref={box} className="relative">
        <button
          type="button"
          disabled={only}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex min-h-[40px] w-full min-w-[220px] max-w-[320px] items-center justify-between gap-3 rounded-dash-sm border-2 px-3.5 py-2 text-left text-[14px] font-medium transition-colors ${
            only
              ? "cursor-default border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] text-[var(--color-text-secondary)]"
              : "border-[var(--color-border-brand)] bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-violet-100)]"
          }`}
        >
          <span className="truncate">{current?.name ?? "No chapter"}</span>
          {!only && <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />}
        </button>

        {open && !only && (
          <div
            role="listbox"
            className="absolute right-0 z-40 mt-1 max-h-[min(60vh,380px)] w-[min(360px,90vw)] overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white shadow-lg"
          >
            {searchable && (
              <div className="relative border-b border-[var(--color-border-subtle)] p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  ref={searchBox}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search ${chapters.length} chapters`}
                  aria-label="Search chapters"
                  className="min-h-[38px] w-full rounded-dash-sm border border-[var(--color-border-default)] bg-white py-2 pl-9 pr-3 text-[14px] outline-none focus-visible:border-[var(--color-border-brand)]"
                />
              </div>
            )}

            <ul className="max-h-[300px] overflow-y-auto overscroll-contain p-1">
              {shown.length === 0 ? (
                <li className="px-3 py-6 text-center text-[13px] text-[var(--color-text-secondary)]">
                  Nothing matches “{q.trim()}”.
                </li>
              ) : (
                shown.map((c) => {
                  const active = c.id === selected;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => choose(c.id)}
                        className={`flex w-full items-center gap-2 rounded-dash-sm px-3 py-2.5 text-left text-[14px] ${
                          active
                            ? "bg-[var(--color-violet-100)] font-medium text-[var(--color-violet-700)]"
                            : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-page-alt)]"
                        }`}
                      >
                        <Check className={`h-4 w-4 shrink-0 ${active ? "" : "opacity-0"}`} />
                        <span className="truncate">{c.name}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
