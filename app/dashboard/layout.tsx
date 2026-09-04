import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { canUseDashboard } from "@/lib/auth/permissions";
import { DashboardShell } from "@/components/dashboard/Shell";
import { NoAccess } from "@/components/dashboard/NoAccess";

export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/**
 * Dashboard gate.
 *
 * Middleware already bounced anonymous visitors to /login. This second check is
 * for people who ARE signed in but have no business here — a new advocate whose
 * profile defaults to `advocate`, or someone suspended. They get an explanation
 * rather than an empty shell.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/dashboard");
  if (!canUseDashboard(profile)) return <NoAccess profile={profile} />;

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
