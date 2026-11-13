"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One measure over time, as columns.
 *
 * Insights draws each measure as its own small chart rather than several on
 * one set of axes: events and attendance differ by two orders of magnitude,
 * and a shared or second axis would make one of them meaningless. One series
 * means one colour (AAC violet, validated against both dashboard surfaces) and
 * no legend — the title says what it is.
 *
 * Columns are capped at 24px with a 4px rounded top on a square baseline;
 * gridlines are hairlines. Only the latest value is labelled; every other value
 * is on hover or keyboard focus, and in the table below the charts.
 */
export function ColumnChart({
  title,
  points,
  unit,
}: {
  title: string;
  points: { label: string; value: number }[];
  /** "events", "people" … used in the tooltip. */
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  /* Drawn at the real width rather than scaled: a scaled SVG shrinks its
     text with it, and on a phone the axis labels became unreadable. */
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(520);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 180;
  const pad = { top: 22, right: 8, bottom: 26, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const max = Math.max(0, ...points.map((p) => p.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.min(24, slot * 0.6);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const every = Math.ceil(points.length / Math.max(2, Math.floor(innerW / 64))); // x labels that fit side by side
  const total = points.reduce((s, p) => s + p.value, 0);
  const last = points.length - 1;

  return (
    <figure className="relative min-w-0 rounded-dash-md border border-[var(--color-border-default)] bg-white p-4 sm:p-5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</span>
        <span className="text-[12px] text-[var(--color-text-secondary)]">{fmt(total)} in period</span>
      </figcaption>

      {/* min-w-0 + overflow-hidden: without them a grid cell sizes itself to
          the chart's first-render width and the chart can never shrink. */}
      <div ref={box} className="w-full min-w-0 overflow-hidden">
      {total === 0 ? (
        <p className="grid h-[150px] place-items-center text-[13px] text-[var(--color-text-secondary)]">Nothing recorded in this period.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={`${title}: ${fmt(total)} in total`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--dash-line)" strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--dash-muted)">
                {compact(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const h = Math.max(0, y(0) - y(p.value));
            const r = Math.min(4, h);
            const x0 = cx - barW / 2;
            const yTop = y(0) - h;
            /* Rounded top, square base: a path rather than rx, which would
               round the baseline too. */
            const d =
              h <= 0
                ? ""
                : `M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${y(0)} Z`;
            return (
              <g key={i}>
                {d && <path d={d} fill="var(--chart-1)" opacity={hover === null || hover === i ? 1 : 0.55} />}
                {/* The hit area is the whole column slot, not the painted bar. */}
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${p.label}: ${fmt(p.value)} ${unit}`}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                />
                {(i % every === 0 && last - i >= every) || i === last ? (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--dash-muted)">
                    {p.label}
                  </text>
                ) : null}
                {i === last && p.value > 0 && (
                  <text x={cx} y={yTop - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--dash-ink)">
                    {compact(p.value)}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={pad.left} x2={W - pad.right} y1={y(0)} y2={y(0)} stroke="var(--dash-line-strong)" strokeWidth={1} />
        </svg>
      )}
      </div>

      {hover !== null && points[hover] && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-2 shadow-dash-pop"
          style={{ left: `${Math.min(84, Math.max(16, ((pad.left + slot * hover + slot / 2) / W) * 100))}%`, top: 36 }}
        >
          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            {fmt(points[hover].value)} <span className="font-normal text-[var(--color-text-secondary)]">{unit}</span>
          </p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">from {points[hover].label}</p>
        </div>
      )}
    </figure>
  );
}

const fmt = (n: number) => n.toLocaleString("en-GB");
const compact = (n: number) =>
  n >= 10_000 ? `${Math.round(n / 100) / 10}K`.replace(".0K", "K") : n.toLocaleString("en-GB");

/** Up to 4 clean ticks from 0: 0/5/10/15, 0/250/500/750 … */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const s = Math.max(1, step);
  const out: number[] = [];
  for (let v = 0; v <= max + s - 1e-9; v += s) out.push(Math.round(v));
  return out;
}
