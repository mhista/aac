"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Search } from "./Icon";

/**
 * Country → application form.
 *
 * Two countries is a row of buttons. Ten is a wall. So: up to five countries
 * render as buttons, because a visible choice is always faster than a hidden
 * one; past five it collapses into a single "Apply" control that opens a
 * searchable list.
 *
 * The threshold lives in one place (`INLINE_LIMIT`) and the switch is
 * automatic — nobody has to remember to change the UI when Kenya is added.
 *
 * Keyboard: the trigger opens on Enter/Space/ArrowDown, focus lands in the
 * search field, ↑/↓ move through results, Enter follows the highlighted one,
 * Escape closes and returns focus to the trigger.
 */

export const INLINE_LIMIT = 5;

export interface ApplicationForm {
  country: string;
  url: string;
}

const linkCls =
  "group inline-flex min-h-[44px] items-center gap-3 rounded-pill bg-[var(--color-action-primary)] px-6 py-3 text-body font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)]";

export function CountryPicker({ forms }: { forms: ApplicationForm[] }) {
  if (forms.length === 0) return null;

  if (forms.length <= INLINE_LIMIT) {
    return (
      <>
        {forms.map((f) => (
          <a key={f.country} href={f.url} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Apply — {f.country}
            <ArrowUpRight className="h-[1.05em] w-[1.05em] shrink-0 transition-transform duration-hover ease-entrance group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ))}
      </>
    );
  }

  return <SearchablePicker forms={forms} />;
}

function SearchablePicker({ forms }: { forms: ApplicationForm[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return forms;
    /* Prefix matches first — typing "gh" should put Ghana above any country
       that merely contains those letters. */
    const starts = forms.filter((f) => f.country.toLowerCase().startsWith(q));
    const contains = forms.filter(
      (f) => !f.country.toLowerCase().startsWith(q) && f.country.toLowerCase().includes(q)
    );
    return [...starts, ...contains];
  }, [forms, query]);

  useEffect(() => setActive(0), [query]);

  /* Focus the search field when the list opens, so someone can start typing
     immediately rather than tabbing into it. */
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Keep the highlighted row in view when arrowing past the fold. */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      const hit = results[active];
      if (hit) {
        e.preventDefault();
        window.open(hit.url, "_blank", "noopener,noreferrer");
        setOpen(false);
      }
    }
  };

  const listId = "country-picker-list";

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={linkCls}
      >
        Apply — choose your country
        <ChevronDown
          className={`h-[1.05em] w-[1.05em] shrink-0 transition-transform duration-hover ease-entrance ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          onKeyDown={onKeyDown}
          className="absolute left-0 top-[calc(100%_+_0.5rem)] z-30 w-[min(22rem,calc(100vw_-_2.5rem))] overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-lift"
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--color-border-subtle)] px-4">
            <Search className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries"
              aria-label="Search countries"
              autoComplete="off"
              className="min-h-[44px] w-full bg-transparent py-3 text-body text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]"
            />
          </div>

          {results.length === 0 ? (
            <p className="px-4 py-5 text-caption leading-body text-[var(--color-text-secondary)]">
              No country matches “{query.trim()}”. If we are not yet open where you are, write to us
              and we will route your application.
            </p>
          ) : (
            <ul id={listId} role="listbox" ref={listRef} data-lenis-prevent className="max-h-64 overflow-y-auto py-1.5">
              {results.map((f, i) => (
                <li key={f.country} role="option" aria-selected={i === active}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setOpen(false)}
                    tabIndex={-1}
                    className={`flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 text-body transition-colors duration-hover ${
                      i === active
                        ? "bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {f.country}
                    <ArrowUpRight className="h-[1.05em] w-[1.05em] shrink-0 opacity-60" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
