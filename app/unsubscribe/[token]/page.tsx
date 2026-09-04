import { redirect } from "next/navigation";
import { unsubscribeByToken } from "@/lib/waitlist/actions";
import { ORG } from "@/lib/org";

export const metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * Unsubscribe.
 *
 * Deliberately NOT a GET that acts. Mail clients, link scanners and corporate
 * security gateways fetch every URL in an email before the person sees it; if
 * this page unsubscribed on load, a share of the list would silently remove
 * itself. So the link lands on a confirmation, and the removal happens on a
 * POST from a form the person pressed.
 *
 * The result state is a redirect rather than component state, so a refresh
 * does not re-post and the outcome survives the back button.
 */
export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const q = await searchParams;

  async function confirm() {
    "use server";
    const ok = await unsubscribeByToken(token);
    redirect(`/unsubscribe/${token}?${ok ? "done=1" : "error=1"}`);
  }

  const shell = (children: React.ReactNode) => (
    <main className="flex min-h-[70svh] items-center px-5 py-24">
      <div className="mx-auto w-full max-w-[46rem]">
        <p className="mono mb-4">{ORG.shortName}</p>
        {children}
        <p className="mono mt-8">Questions? {ORG.email.general}</p>
      </div>
    </main>
  );

  if (q.done) {
    return shell(
      <>
        <h1 className="display text-[clamp(1.9rem,1.4rem+2.2vw,3rem)]">You are unsubscribed.</h1>
        <p className="measure mt-5 text-body-l leading-body text-[var(--color-text-secondary)]">
          We will not email you about applications again. If you change your mind, you can rejoin
          from any of the Get Involved pages.
        </p>
        <a
          href="/get-involved"
          className="mt-9 inline-flex min-h-[44px] items-center rounded-pill border border-[var(--color-action-secondary-border)] px-8 py-4 text-body-l font-medium text-[var(--color-action-secondary-text)] transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-secondary-hover-surface)]"
        >
          Back to Get Involved
        </a>
      </>
    );
  }

  if (q.error) {
    return shell(
      <>
        <h1 className="display text-[clamp(1.9rem,1.4rem+2.2vw,3rem)]">That link is not valid.</h1>
        <p className="measure mt-5 text-body-l leading-body text-[var(--color-text-secondary)]">
          It may have already been used, or it may have been cut short by your email client. Write
          to {ORG.email.general} and we will take you off the list by hand.
        </p>
      </>
    );
  }

  return shell(
    <>
      <h1 className="display text-[clamp(1.9rem,1.4rem+2.2vw,3rem)]">
        Stop emails about applications?
      </h1>
      <p className="measure mt-5 text-body-l leading-body text-[var(--color-text-secondary)]">
        You will be taken off the list we email when an intake opens. Nothing else changes, and you
        can join again at any time from the Get Involved pages.
      </p>

      <form action={confirm} className="mt-9 flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded-pill bg-[var(--color-action-primary)] px-8 py-4 text-body-l font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)]"
        >
          Yes, unsubscribe me
        </button>
        <a
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-pill border border-[var(--color-action-secondary-border)] px-8 py-4 text-body-l font-medium text-[var(--color-action-secondary-text)] transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-secondary-hover-surface)]"
        >
          Keep me on the list
        </a>
      </form>
    </>
  );
}
