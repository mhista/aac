"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL, type Profile } from "@/lib/auth/permissions";
import { canRead, type Area } from "@/lib/auth/capabilities";

/**
 * Dashboard shell.
 *
 * A fixed white rail on the left with icon-and-label navigation, the active
 * page a solid pill; quiet neutral surfaces; generous rounded cards. On a
 * phone the rail becomes a top bar with a row of scrolling tabs, so every
 * section is one tap away without opening a drawer.
 *
 * Dark by default. The sun/moon switch in the rail (and the phone top bar)
 * flips to light and back; the choice is kept in this browser's storage, so
 * it sticks per device. The server always renders dark, then the stored
 * choice is applied — so a person who picked light sees one dark frame at
 * most, and everyone else never sees a flash at all.
 *
 * Navigation is filtered by role rather than disabled: a campus coordinator
 * should not see a Settings link they can never open. That is cosmetic, not
 * security — RLS is the boundary — but it is the difference between a tool that
 * feels built for you and one that feels like it is refusing you.
 */

type NavItem = { label: string; href: string; area?: Area; icon: IconName };
type NavGroup = { group: string | null; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: null,
    items: [
      { label: "Overview", href: "/dashboard", icon: "home" },
      { label: "Insights", href: "/dashboard/insights", area: "insights", icon: "trend" },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Events", href: "/dashboard/events", area: "events", icon: "calendar" },
      { label: "Blog", href: "/dashboard/blog", area: "blog", icon: "article" },
      { label: "Programmes", href: "/dashboard/programmes", area: "programmes", icon: "layers" },
      { label: "Pages", href: "/dashboard/pages", area: "pages", icon: "layout" },
      { label: "Media", href: "/dashboard/media", area: "media", icon: "image" },
    ],
  },
  {
    group: "People",
    items: [
      { label: "Chapters", href: "/dashboard/chapters", area: "chapters", icon: "pin" },
      { label: "Chapter executives", href: "/dashboard/executives", area: "campusTeam", icon: "badge" },
      { label: "Advocates", href: "/dashboard/people", area: "advocates", icon: "megaphone" },
      { label: "Applications", href: "/dashboard/applications", area: "applications", icon: "inbox" },
      { label: "Impact reports", href: "/dashboard/impact-reports", area: "impactReports", icon: "report" },
    ],
  },
  {
    group: "Organisation",
    items: [
      { label: "Impact metrics", href: "/dashboard/impact", area: "impactMetrics", icon: "chart" },
      { label: "Team & directors", href: "/dashboard/team", area: "team", icon: "users" },
      { label: "Enquiries", href: "/dashboard/enquiries", area: "enquiries", icon: "mail" },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Users & roles", href: "/dashboard/users", area: "users", icon: "shield" },
      { label: "Site settings", href: "/dashboard/settings", area: "settings", icon: "settings" },
      { label: "Audit log", href: "/dashboard/audit", area: "audit", icon: "history" },
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

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY) === "light") setTheme("light");
    } catch {
      /* Storage blocked (private mode, policy): stay dark. */
    }
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* Not remembered, but still switched for this visit. */
    }
  }
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  const groups = NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.area || canRead(profile, i.area)) }))
    .filter((g) => g.items.length > 0);
  const flat = groups.flatMap((g) => g.items);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    /* If the build has no Supabase keys there is no session to end; still
       send them out of the dashboard rather than doing nothing. */
    await createClient()?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const name = profile.full_name ?? profile.email ?? "";
  const initials = (name || "?")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  /* Keep the current section's tab in view on the phone tab row. */
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    tabsRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <div className={clsx("dash-ui min-h-[100svh] text-[14px] text-[var(--dash-ink)]", theme === "dark" && "dash-dark")}>
      {/* ── Desktop rail ─────────────────────────────────────────── */}
      <aside
        data-lenis-prevent
        className="fixed inset-y-0 left-0 z-20 hidden w-[256px] flex-col border-r border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-4 lg:flex"
      >
        <Link href="/dashboard" className="flex items-center gap-3 px-2 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aac-icon-96.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-[-0.02em]">All Against Cancer</span>
            <span className="block text-[12px] text-[var(--dash-muted)]">Dashboard</span>
          </span>
        </Link>

        <nav aria-label="Dashboard" className="-mx-1 flex-1 space-y-5 overflow-y-auto overscroll-contain px-1">
          {groups.map((g) => (
            <div key={g.group ?? "top"}>
              {g.group && (
                <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--dash-faint)]">
                  {g.group}
                </p>
              )}
              <ul className="space-y-0.5">
                {g.items.map((i) => {
                  const active = isActive(i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={active ? "page" : undefined}
                        className={clsx(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors duration-hover",
                          active
                            ? "dash-active text-white"
                            : "text-[var(--dash-body)] hover:bg-[var(--dash-wash)] hover:text-[var(--dash-ink)]"
                        )}
                      >
                        <NavIcon name={i.icon} className={active ? "opacity-100" : "opacity-70"} />
                        <span className="truncate">{i.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {profile.role === "board_member" && (
            <p className="rounded-xl bg-[var(--dash-wash)] p-3 text-[12px] leading-relaxed text-[var(--dash-body)]">
              You have read access across the organisation. Editing is intentionally
              off for board accounts.
            </p>
          )}
        </nav>

        <div className="mt-3 space-y-0.5 border-t border-[var(--dash-line)] pt-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium text-[var(--dash-body)] hover:bg-[var(--dash-wash)] hover:text-[var(--dash-ink)]"
          >
            <NavIcon name="external" className="opacity-70" /> View website
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium text-[var(--dash-body)] hover:bg-[var(--dash-wash)] hover:text-[var(--dash-ink)]"
          >
            <NavIcon name={theme === "dark" ? "sun" : "moon"} className="opacity-70" />
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium text-[var(--dash-body)] hover:bg-[var(--dash-wash)] hover:text-[var(--dash-ink)]"
          >
            <NavIcon name="logout" className="opacity-70" /> Sign out
          </button>
          <div className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-violet-100)] text-[12px] font-semibold text-[var(--color-violet-700)]">
              {initials}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-medium">{name}</span>
              <span className="block truncate text-[12px] text-[var(--dash-muted)]">{ROLE_LABEL[profile.role]}</span>
            </span>
          </div>
        </div>
      </aside>

      {/* ── Phone: top bar + scrolling tabs ─────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--dash-line)] bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aac-icon-96.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">AAC Dashboard</span>
          </Link>
          <div className="flex items-center gap-1">
            <button type="button" onClick={toggleTheme} aria-label={themeLabel} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--dash-body)] hover:bg-[var(--dash-wash)]">
              <NavIcon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <a href="/" target="_blank" rel="noreferrer" aria-label="View website" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--dash-body)] hover:bg-[var(--dash-wash)]">
              <NavIcon name="external" />
            </a>
            <button type="button" onClick={signOut} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--dash-body)] hover:bg-[var(--dash-wash)]">
              <NavIcon name="logout" />
            </button>
            <span title={`${name} · ${ROLE_LABEL[profile.role]}`} className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-[var(--color-violet-100)] text-[11px] font-semibold text-[var(--color-violet-700)]">
              {initials}
            </span>
          </div>
        </div>
        <nav ref={tabsRef} aria-label="Dashboard" className="dash-no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2.5">
          {flat.map((i) => {
            const active = isActive(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium",
                  active ? "dash-active text-white" : "bg-[var(--dash-wash)] text-[var(--dash-body)]"
                )}
              >
                <NavIcon name={i.icon} size={15} />
                {i.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 lg:pl-[256px]">
        <div className="px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────
   Simple 24px line icons, drawn here so the dashboard needs no icon
   package. Decorative: every one sits next to its label. */
type IconName =
  | "home" | "calendar" | "article" | "layers" | "layout" | "image" | "pin" | "badge"
  | "megaphone" | "inbox" | "report" | "chart" | "users" | "mail" | "shield"
  | "settings" | "history" | "external" | "logout" | "sun" | "moon" | "trend";

const THEME_KEY = "aac-dashboard-theme";

const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12h2M8 16h2M14 12h2",
  article: "M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 12h8M8 16h6",
  layers: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  layout: "M4 4h16v16H4zM4 9h16M10 9v11",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  badge: "M12 3l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2zM9 12l2 2 4-4",
  megaphone: "M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6M8 14l1.5 5h2.5L11 15",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z",
  report: "M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 17v-3M12 17v-6M15 17v-4",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15 5.15a3.5 3.5 0 0 1 0 6.7",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM9 12l2 2 4-4",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
};

function NavIcon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={clsx("shrink-0", className)}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
