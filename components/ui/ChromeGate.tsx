"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the public site's navigation and footer inside the dashboard.
 *
 * The root layout wraps every route, so /dashboard was inheriting the marketing
 * header and footer — and, worse, an unbuilt dashboard route fell through to the
 * root 404, which rendered as a *public site* page. That is why the sidebar
 * looked like it was throwing people back onto the website.
 *
 * The properly idiomatic fix is a `(site)` route group with its own layout, but
 * that means physically moving twenty route folders. This achieves the same
 * result in one file and can be swapped for the route group later without
 * touching anything else.
 *
 * `usePathname` resolves during server rendering too, so the chrome is absent
 * from the first paint — there is no flash of a header that then disappears.
 */

const BARE = ["/dashboard", "/login", "/auth"];

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (BARE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return <>{children}</>;
}
