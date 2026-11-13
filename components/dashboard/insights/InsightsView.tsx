import Link from "next/link";
import { changeLabel, PERIODS, type Insights, type Metric, type BreakdownRow } from "@/lib/insights";
import { PageHeader, StatusPill, EmptyPanel, fmtDate } from "@/components/dashboard/ui";
import { ColumnChart } from "./ColumnChart";
import { InsightsFilters } from "./Filters";

/**
 * The Insights page's layout, given the computed report (lib/insights.ts):
 * headline numbers with their change, a small chart per measure, a
 * breakdown one level down the hierarchy, work in progress, recent changes.
 */
export function InsightsView({ data }: { data: Insights }) {
  const { kpis, period } = data;
  const vs = `vs previous ${period.id === "12m" ? "12 months" : `${period.days} days`}`;

  const tiles: { label: string; m: Metric; note?: string }[] = [
    { label: "Events held", m: kpis.events },
    { label: "Event attendance", m: kpis.attendance, note: "People recorded at events" },
    { label: "Screenings done", m: kpis.screenings },
    { label: "New advocates", m: kpis.advocates },
    { label: "Articles published", m: kpis.articles },
    { label: "Reached by advocates", m: kpis.verifiedReach, note: "From verified impact reports" },
    { label: "Materials distributed", m: kpis.materials },
    ...(kpis.applications ? [{ label: "Applications received", m: kpis.applications }] : []),
    ...(kpis.enquiries ? [{ label: "Enquiries received", m: kpis.enquiries }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Insights"
        description={`${data.scope.label} · ${fmtDate(data.range.from)} to ${fmtDate(data.range.to)}. Only recorded, published activity is counted — events by the date they happened, impact by verified reports.`}
      />

      <InsightsFilters
        scope={data.scope.value}
        period={period.id}
        scopeOptions={data.scopeOptions}
        periods={PERIODS.map(({ id, label }) => ({ id, label }))}
      />

      {/* ── Headline numbers ──────────────────────────────────── */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const c = changeLabel(t.m);
          const tone =
            c.dir === "up"
              ? "text-[var(--color-feedback-success-text)]"
              : c.dir === "down"
                ? "text-[var(--color-feedback-danger-text)]"
                : "text-[var(--color-text-secondary)]";
          return (
            <li key={t.label} className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-4 sm:p-5">
              <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">{t.label}</p>
              <p className="font-display mt-3 text-[30px] leading-none text-[var(--color-text-display)]">
                {t.m.current.toLocaleString("en-GB")}
              </p>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-[12px]">
                <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
                  <span aria-hidden="true">{c.dir === "up" ? "↑" : c.dir === "down" ? "↓" : "→"}</span>
                  {c.text}
                </span>
                <span className="text-[var(--color-text-secondary)]">{vs}</span>
              </p>
              {t.note && <p className="mt-1 text-[11.5px] text-[var(--dash-faint)]">{t.note}</p>}
            </li>
          );
        })}
      </ul>

      {/* ── Trends ───────────────────────────────────────────── */}
      <h2 className="mb-3 mt-10 text-[16px] font-semibold tracking-[-0.01em]">
        Over time{" "}
        <span className="font-normal text-[var(--color-text-secondary)]">· {period.id === "12m" ? "by month" : "by week"}</span>
      </h2>
      <div className="grid gap-3 lg:grid-cols-2">
        <ColumnChart title="Events held" points={data.series.events} unit="events" />
        <ColumnChart title="Event attendance" points={data.series.attendance} unit="people" />
        <ColumnChart title="New advocates" points={data.series.advocates} unit="sign-ups" />
        <ColumnChart title="Articles published" points={data.series.articles} unit="articles" />
      </div>

      {/* ── Breakdown one level down ─────────────────────────── */}
      {data.breakdown && (
        <section className="mt-10">
          <h2 className="mb-1 text-[16px] font-semibold tracking-[-0.01em]">By {data.breakdown.unit.toLowerCase()}</h2>
          <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">
            Every {data.breakdown.unit.toLowerCase()} in view, including any with nothing recorded this period. Click a name to look inside it.
          </p>
          <BreakdownTable unit={data.breakdown.unit} rows={data.breakdown.rows} />
        </section>
      )}

      {/* ── At chapter level: the events themselves ─────────── */}
      {!data.breakdown && (
        <section className="mt-10">
          <h2 className="mb-3 text-[16px] font-semibold tracking-[-0.01em]">Events in this period</h2>
          {data.eventsInPeriod.length === 0 ? (
            <EmptyPanel title="No events recorded" body="Published events whose date falls in this period appear here, with their attendance and screenings." />
          ) : (
            <div className="overflow-x-auto rounded-dash-md border border-[var(--color-border-default)] bg-white">
              <table className="w-full text-[13px]">
                <caption className="sr-only">Events held in this period</caption>
                <thead>
                  <tr className="border-b border-[var(--color-border-default)] text-left">
                    <th scope="col" className="mono px-4 py-3 font-normal">Event</th>
                    <th scope="col" className="mono px-4 py-3 font-normal">Date</th>
                    <th scope="col" className="mono px-4 py-3 text-right font-normal">Attendance</th>
                    <th scope="col" className="mono px-4 py-3 text-right font-normal">Screenings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.eventsInPeriod.map((e) => (
                    <tr key={e.slug} className="border-b border-[var(--color-border-subtle)] last:border-0">
                      <td className="px-4 py-3 font-medium">
                        <a href={`/events/${e.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                          {e.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{e.attendance?.toLocaleString("en-GB") ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{e.screenings?.toLocaleString("en-GB") ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* ── Work in progress ──────────────────────────────── */}
        <section>
          <h2 className="mb-1 text-[16px] font-semibold tracking-[-0.01em]">In progress now</h2>
          <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">Not yet published, whatever the period.</p>
          <div className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white">
            <table className="w-full text-[13px]">
              <caption className="sr-only">Unpublished events and articles by status</caption>
              <thead>
                <tr className="border-b border-[var(--color-border-default)] text-left">
                  <th scope="col" className="mono px-4 py-3 font-normal">Status</th>
                  <th scope="col" className="mono px-4 py-3 text-right font-normal">Events</th>
                  <th scope="col" className="mono px-4 py-3 text-right font-normal">Articles</th>
                </tr>
              </thead>
              <tbody>
                {data.pipeline.map((s) => (
                  <tr key={s.status} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Link href={`/dashboard/events?status=${s.status}`} className="hover:underline">
                        {s.events}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Link href={`/dashboard/blog?status=${s.status}`} className="hover:underline">
                        {s.articles}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── What changed ──────────────────────────────────── */}
        <section>
          <h2 className="mb-1 text-[16px] font-semibold tracking-[-0.01em]">Recent changes</h2>
          <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">The latest edits and sign-ups in view.</p>
          {data.feed.length === 0 ? (
            <EmptyPanel title="Nothing yet" body="Edits to events and articles, new advocates and impact reports appear here as they happen." />
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)] overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white">
              {data.feed.map((f, i) => (
                <li key={i}>
                  <Link href={f.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--dash-row-hover)]">
                    <span className="w-[92px] shrink-0 text-[12px] font-medium text-[var(--color-text-secondary)]">{f.kind}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{f.title}</span>
                      <span className="block truncate text-[12px] text-[var(--color-text-secondary)]">
                        {f.where} · {relative(f.at)}
                      </span>
                    </span>
                    {f.status && STATUS_KEYS.has(f.status) && <StatusPill status={f.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const STATUS_KEYS = new Set(["draft", "in_review", "changes_requested", "scheduled", "published", "archived"]);

function relative(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return fmtDate(iso);
}

type Col = "events" | "attendance" | "screenings" | "advocates" | "articles" | "verifiedReach";

function BreakdownTable({ unit, rows }: { unit: string; rows: BreakdownRow[] }) {
  const maxAttendance = Math.max(1, ...rows.map((r) => r.attendance));
  const sum = (k: Col) => rows.reduce((s, r) => s + r[k], 0).toLocaleString("en-GB");
  return (
    <div className="overflow-x-auto rounded-dash-md border border-[var(--color-border-default)] bg-white">
      <table className="w-full min-w-[780px] text-[13px]">
        <caption className="sr-only">Activity by {unit.toLowerCase()} in this period</caption>
        <thead>
          <tr className="border-b border-[var(--color-border-default)] text-left">
            <th scope="col" className="mono px-4 py-3 font-normal">{unit}</th>
            <th scope="col" className="mono px-4 py-3 text-right font-normal">Events</th>
            <th scope="col" className="mono px-4 py-3 font-normal">Attendance</th>
            <th scope="col" className="mono px-4 py-3 text-right font-normal">Screenings</th>
            <th scope="col" className="mono px-4 py-3 text-right font-normal">New advocates</th>
            <th scope="col" className="mono px-4 py-3 text-right font-normal">Articles</th>
            <th scope="col" className="mono px-4 py-3 text-right font-normal">Verified reach</th>
            <th scope="col" className="mono px-4 py-3 font-normal">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const quiet = !r.lastActivity;
            return (
              <tr key={r.key} className="border-b border-[var(--color-border-subtle)] last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {r.href ? (
                    <Link href={r.href} className="hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    r.label
                  )}
                </th>
                <td className="px-4 py-3 text-right tabular-nums">{r.events}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="h-2 w-[90px] overflow-hidden rounded-full bg-[var(--dash-wash)]" aria-hidden="true">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(r.attendance / maxAttendance) * 100}%`, background: "var(--chart-1)" }}
                      />
                    </span>
                    <span className="tabular-nums">{r.attendance.toLocaleString("en-GB")}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.screenings.toLocaleString("en-GB")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.advocates.toLocaleString("en-GB")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.articles}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.verifiedReach.toLocaleString("en-GB")}</td>
                <td className={`px-4 py-3 ${quiet ? "text-[var(--color-feedback-warning-text)]" : "text-[var(--color-text-secondary)]"}`}>
                  {quiet ? "Nothing this period" : fmtDate(r.lastActivity)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--color-border-default)] font-semibold">
            <th scope="row" className="px-4 py-3 text-left">Total</th>
            <td className="px-4 py-3 text-right tabular-nums">{sum("events")}</td>
            <td className="px-4 py-3 tabular-nums">{sum("attendance")}</td>
            <td className="px-4 py-3 text-right tabular-nums">{sum("screenings")}</td>
            <td className="px-4 py-3 text-right tabular-nums">{sum("advocates")}</td>
            <td className="px-4 py-3 text-right tabular-nums">{sum("articles")}</td>
            <td className="px-4 py-3 text-right tabular-nums">{sum("verifiedReach")}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
