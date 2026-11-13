import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { canRead } from "@/lib/auth/capabilities";
import { getInsights } from "@/lib/insights";

export const dynamic = "force-dynamic";

/**
 * Insights as a spreadsheet: exactly the scope and period on screen.
 *
 * The same permission check and the same scoping as the page — asking for a
 * scope outside your remit gets your own, as it does there — and the database
 * still decides what any row query may return.
 */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (!profile) return new NextResponse("Not signed in.", { status: 401 });
  if (!canRead(profile, "insights")) return new NextResponse("Not allowed.", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const data = await getInsights(profile, {
    scope: sp.get("scope") ?? undefined,
    period: sp.get("period") ?? undefined,
  });
  if (!data || !data.reachable) return new NextResponse("Nothing to export.", { status: 404 });

  const lines: (string | number | null)[][] = [];
  lines.push(["AAC insights"]);
  lines.push(["Showing", data.scope.label]);
  lines.push(["Period", data.period.label, data.range.from.slice(0, 10), data.range.to.slice(0, 10)]);
  lines.push([]);
  lines.push(["Measure", "This period", "Previous period"]);
  const k = data.kpis;
  const kpiRows: [string, { current: number; previous: number } | undefined][] = [
    ["Events held", k.events],
    ["Event attendance", k.attendance],
    ["Screenings done", k.screenings],
    ["Materials distributed", k.materials],
    ["New advocates", k.advocates],
    ["Articles published", k.articles],
    ["Reached by advocates (verified reports)", k.verifiedReach],
    ["Applications received", k.applications],
    ["Enquiries received", k.enquiries],
  ];
  for (const [label, m] of kpiRows) if (m) lines.push([label, m.current, m.previous]);
  lines.push([]);

  if (data.breakdown) {
    lines.push([data.breakdown.unit, "Events", "Attendance", "Screenings", "New advocates", "Articles", "Verified reach", "Last activity"]);
    for (const r of data.breakdown.rows) {
      lines.push([r.label, r.events, r.attendance, r.screenings, r.advocates, r.articles, r.verifiedReach, r.lastActivity?.slice(0, 10) ?? ""]);
    }
  } else {
    lines.push(["Event", "Date", "Attendance", "Screenings"]);
    for (const e of data.eventsInPeriod) lines.push([e.title, e.date.slice(0, 10), e.attendance, e.screenings]);
  }

  const csv = "﻿" + lines.map((row) => row.map(cell).join(",")).join("\r\n");
  const name = `aac-insights-${slug(data.scope.label)}-${data.period.id}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

/* Quote every text cell, and defuse anything a spreadsheet would run as a
   formula — chapter and event names are typed by people, and a name starting
   with "=" must stay a name. */
function cell(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "aac";
