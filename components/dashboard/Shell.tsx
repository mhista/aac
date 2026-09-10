"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { Close, Menu } from "@/components/ui/Icon";
import { ROLE_LABEL, type Profile } from "@/lib/auth/permissions";
import { canRead, type Area } from "@/lib/auth/capabilities";

/**
 * Dashboard shell.
 *
 * Deliberately tighter than the public site — 14px base, small radii, dense
 * rows. This is a tool, not a marketing page, and the design system has a
 * separate dashboard token set for exactly that reason.
 *
 * Navigation is filtered by role rather than disabled: a campus coordinator
 * should not see a Settings link they can never open. That is cosmetic, not
 * security — RLS is the boundary — but it is the difference between a tool that
 * feels built for you and one that feels like it is refusing you.
 */

type NavItem = { label: string; href: string; area: Area };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "Content",
    items: [
      { label: "Events", href: "/dashboard/events", area: "events" },
      { label: "Blog", href: "/dashboard/blog", area: "blog" },
      { label: "Programmes", href: "/dashboard/programmes", area: "programmes" },
      { label: "Pages", href: "/dashboard/pages", area: "pages" },
      { label: "Media", href: "/dashboard/media", area: "media" },
    ],
  },
  {
    group: "People",
    items: [
      { label: "Chapters", href: "/dashboard/chapters", area: "chapters" },
      { label: "Chapter executives", href: "/dashboard/executives", area: "campusTeam" },
      { label: "Advocates", href: "/dashboard/people", area: "advocates" },
      { label: "Applications", href: "/dashboard/applications", area: "applications" },
      { label: "Impact reports", href: "/dashboard/impact-reports", area: "impactReports" },
    ],
  },
  {
    group: "Organisation",
    items: [
      { label: "Impact metrics", href: "/dashboard/impact", area: "impactMetrics" },
      { label: "Team & directors", href: "/dashboard/team", area: "team" },
      { label: "Enquiries", href: "/dashboard/enquiries", area: "enquiries" },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Users & roles", href: "/dashboard/users", area: "users" },
      { label: "Site settings", href: "/dashboard/settings", area: "settings" },
      { label: "Audit log", href: "/dashboard/audit", area: "audit" },
    ],
  },
];

export function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const groups = NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => canRead(profile, i.area)) }))
    .filter((g) => g.items.length > 0);

  async function signOut() {
    /* If the build has no Supabase keys there is no session to end; still
       send them out of the dashboard rather than doing nothing. */
    await createClient()?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (profile.full_name ?? profile.email ?? "?")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  return (
    <div className="min-h-[100svh] bg-[#FBFAF9] text-[14px] text-[var(--color-text-primary)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border-default)] bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-dash-sm hover:bg-[var(--color-surface-page-alt)] lg:hidden"
          >
            {open ? <Close className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aac-icon-96.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="font-display text-[15px] text-[var(--color-text-display)]">AAC</span>
          </Link>
          <span className="mono hidden sm:inline">Dashboard</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="mono hidden rounded-dash-sm px-2.5 py-1.5 hover:bg-[var(--color-surface-page-alt)] sm:inline-block"
          >
            View site
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-pill bg-[var(--color-violet-100)] text-[12px] font-medium text-[var(--color-violet-700)]">
              {initials}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[13px] font-medium">{profile.full_name ?? profile.email}</span>
              <span className="mono">{ROLE_LABEL[profile.role]}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mono rounded-dash-sm px-2.5 py-1.5 hover:bg-[var(--color-surface-page-alt)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex items-start">
        {/* Sidebar */}
        <aside
          data-lenis-prevent
          className={clsx(
            /* Two things are load-bearing here.
               1. `calc(100svh_-_3.5rem)` — the underscores matter. Tailwind
                  converts them to spaces, and calc() requires whitespace
                  around the minus. Written as `calc(100svh-3.5rem)` the
                  browser discards the declaration, the sidebar gets no
                  height, and overflow-y-auto has nothing to scroll against.
               2. `self-start`. A flex child defaults to
               align-self: stretch, so the sidebar was being stretched to the
                  align-self: stretch, which makes position:sticky a no-op.
                  Sticky needs an element shorter than its container. */
            "fixed bottom-0 left-0 top-14 z-20 w-[240px] shrink-0 overflow-y-auto overscroll-contain border-r border-[var(--color-border-default)] bg-white px-3 py-5 transition-transform duration-standard ease-entrance",
            "lg:sticky lg:top-14 lg:h-[calc(100svh_-_3.5rem)] lg:self-start lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav aria-label="Dashboard">
            {groups.map((g) => (
              <div key={g.group} className="mb-6">
                <p className="mono mb-2 px-2.5">{g.group}</p>
                <ul className="space-y-0.5">
                  {g.items.map((i) => {
                    const active = pathname === i.href || pathname.startsWith(`${i.href}/`);
                    return (
                      <li key={i.href}>
                        <Link
                          href={i.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={clsx(
                            "block rounded-dash-sm px-2.5 py-2 text-[13px] transition-colors duration-hover",
                            active
                              ? "bg-[var(--color-violet-100)] font-medium text-[var(--color-violet-700)]"
                              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)] hover:text-[var(--color-text-primary)]"
                          )}
                        >
                          {i.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {profile.role === "board_member" && (
            <p className="mt-4 rounded-dash-sm bg-[var(--color-surface-page-alt)] p-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              You have read access across the organisation. Editing is intentionally
              off for board accounts.
            </p>
          )}
        </aside>

        {open && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 bg-[rgba(23,11,48,.4)] lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
