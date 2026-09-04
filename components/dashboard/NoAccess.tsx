import Link from "next/link";
import { ROLE_LABEL, type Profile } from "@/lib/auth/permissions";
import { ORG } from "@/lib/org";

/** Signed in, but not to anything. Says why, and what to do about it. */
export function NoAccess({ profile }: { profile: Profile }) {
  const suspended = profile.status === "suspended";
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-5 py-20">
      <div className="w-full max-w-[520px] rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-8 md:p-10">
        <p className="mono mb-4">{suspended ? "Account suspended" : "No dashboard access"}</p>
        <h1 className="display text-[1.75rem]">
          {suspended ? "This account is on hold." : "You are signed in, but not set up yet."}
        </h1>
        <p className="mt-4 text-body leading-body text-[var(--color-text-secondary)]">
          {suspended
            ? "Your access has been paused. If you think that is a mistake, contact an administrator and they will look at it."
            : `Your account is signed in as ${ROLE_LABEL[profile.role]}, which does not include the dashboard. A coordinator or administrator needs to give you a role before you can work in here.`}
        </p>
        <dl className="mt-7 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
          <div className="flex justify-between gap-6 py-3">
            <dt className="mono">Signed in as</dt>
            <dd className="text-caption">{profile.email}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="mono">Role</dt>
            <dd className="text-caption">{ROLE_LABEL[profile.role]}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`mailto:${ORG.email.general}?subject=${encodeURIComponent("Dashboard access")}`}
             className="inline-flex min-h-[44px] items-center rounded-pill bg-[var(--color-action-primary)] px-6 text-body font-medium text-white hover:bg-[var(--color-action-primary-hover)]">
            Request access
          </a>
          <Link href="/" className="inline-flex min-h-[44px] items-center rounded-pill border border-[var(--color-action-secondary-border)] px-6 text-body font-medium text-[var(--color-action-secondary-text)] hover:bg-[var(--color-action-secondary-hover-surface)]">
            Back to the website
          </Link>
        </div>
      </div>
    </div>
  );
}
