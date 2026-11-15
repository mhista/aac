"use client";

import { useMemo, useState } from "react";
import { Search } from "@/components/ui/Icon";
import { Empty } from "@/components/ui/Empty";
import { PlaceCard } from "./PlaceCard";
import { serviceName, normState, type CarePlace } from "@/lib/care";

/**
 * Search and narrow a list of places by state and town.
 *
 * Everything happens in the browser: the list arrives with the page, so typing
 * is instant and works on a poor connection once the page has loaded.
 */
export function PlaceFinder({
  places,
  highlight,
  noun = "places",
  emptyTitle,
  emptyBody,
}: {
  places: CarePlace[];
  highlight?: string;
  noun?: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");

  const states = useMemo(
    () =>
      Array.from(new Set(places.map((p) => normState(p.state)).filter((s): s is string => !!s))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [places]
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return places.filter((p) => {
      if (state && normState(p.state) !== state) return false;
      if (!needle) return true;
      const hay = [p.name, p.address, p.city, p.state, p.medicines, p.summary, ...p.services.map(serviceName)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [places, q, state]);

  if (places.length === 0) {
    return (
      <Empty
        title={emptyTitle}
        body={emptyBody}
        cta={{ label: "Suggest a place", href: "/contact" }}
        compact
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search {noun}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, town or area"
            className="min-h-[52px] w-full rounded-pill border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] pl-12 pr-5 text-body text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-display)]"
          />
        </label>
        {states.length > 1 && (
          <label className="md:w-[240px]">
            <span className="sr-only">State</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="min-h-[52px] w-full rounded-pill border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-5 text-body text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-display)]"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="mono mt-6" aria-live="polite">
        {shown.length} {shown.length === 1 ? noun.replace(/ies$/, "y").replace(/s$/, "") : noun}
        {state ? ` in ${state}` : ""}
      </p>

      {shown.length === 0 ? (
        <p className="mt-8 text-body text-[var(--color-text-secondary)]">
          Nothing matches that. Try a nearby town, or clear the search.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              <PlaceCard place={p} highlight={highlight} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
