import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canUseDashboard } from "@/lib/auth/permissions";
import { DashboardShell } from "@/components/dashboard/Shell";
import { NoAccess } from "@/components/dashboard/NoAccess";
import { ToastProvider } from "@/components/dashboard/Toast";
import { ORG } from "@/lib/org";

export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/**
 * Dashboard gate.
 *
 * This used to redirect to /login whenever the profile was null. That is one
 * half of an infinite redirect: middleware sends /login back to /dashboard
 * whenever a session exists, so any signed-in person whose profile row could
 * not be read bounced between the two forever, at a request a second, until
 * they closed the tab.
 *
 * The two cases are different and must be treated differently:
 *
 *   no session          → /login is correct. Middleware normally catches this
 *                         first; this is the belt to its braces.
 *   session, no profile → NEVER redirect. Something is wrong on our side —
 *                         a migration half-run, a deleted row, RLS refusing —
 *                         and the honest response is to say so and stop.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    const db = await createClient();
    const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };

    /* Genuinely signed out — safe to send to the login page, because
       middleware will not send them back. */
    if (!data?.user) redirect("/login?next=/dashboard");

    /* Signed in, but we cannot load their profile. Stop here. */
    return (
      <main className="mx-auto max-w-[52rem] px-5 py-24">
        <h1 className="font-display text-[1.75rem] text-[var(--color-text-display)]">
          We cannot load your account
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
          You are signed in as <strong>{data.user.email}</strong>, but your profile could not be
          read. That is a problem on our side, not something you did wrong — usually a database
          migration that has not finished running.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
          Tell whoever administers this site, or write to {ORG.email.general}. Signing out and back
          in will not help.
        </p>
        <form action="/auth/signout" method="post" className="mt-8">
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-pill border border-[var(--color-action-secondary-border)] px-6 py-3 text-[14px] font-medium text-[var(--color-action-secondary-text)]"
          >
            Back to the website
          </a>
        </form>
      </main>
    );
  }

  if (!canUseDashboard(profile)) return <NoAccess profile={profile} />;

  return (
    <ToastProvider>
      <DashboardShell profile={profile}>{children}</DashboardShell>
    </ToastProvider>
  );
}
