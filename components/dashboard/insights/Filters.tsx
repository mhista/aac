"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { inputCls, BTN } from "../ui";

/**
 * The one row of controls above Insights: whose numbers, over what period,
 * and a CSV export of exactly what is on screen. Changing either select
 * reloads the page with the new choice in the address, so a view can be
 * bookmarked or sent to someone ("here is the South East for the quarter").
 */
export function InsightsFilters({
  scope,
  period,
  scopeOptions,
  periods,
}: {
  scope: string;
  period: string;
  scopeOptions: { value: string; label: string; depth: number }[];
  periods: { id: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const go = (key: "scope" | "period", value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    start(() => router.push(`/dashboard/insights?${next.toString()}`));
  };

  const exportHref = `/dashboard/insights/export?${new URLSearchParams({ scope, period }).toString()}`;

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3" aria-busy={pending}>
      {scopeOptions.length > 1 && (
        <label className="min-w-[220px] flex-1 sm:flex-none">
          <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-primary)]">Showing</span>
          <select value={scope} onChange={(e) => go("scope", e.target.value)} className={inputCls}>
            {scopeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {"  ".repeat(o.depth)}
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="min-w-[180px]">
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-primary)]">Period</span>
        <select value={period} onChange={(e) => go("period", e.target.value)} className={inputCls}>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <a href={exportHref} className={`${BTN.secondary} sm:ml-auto`} download>
        Download CSV
      </a>
      {pending && <span className="text-[12px] text-[var(--color-text-secondary)]">Loading…</span>}
    </div>
  );
}
