"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight } from "@/components/ui/Icon";
import { ORG } from "@/lib/org";

/**
 * Sign in.
 *
 * Magic link by default — no password to forget, reuse or leak, which matters
 * when the people signing in are 40+ campus coordinators rather than engineers.
 * Password sign-in is offered as a fallback for accounts that have one set.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<"link" | "password">("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const db = createClient();

    if (mode === "link") {
      const { error } = await db.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) { setError(error.message); setState("error"); return; }
      setState("sent");
      return;
    }

    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError(error.message); setState("error"); return; }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-5 py-20">
      <div className="w-full max-w-[440px]">
        <Link href="/" className="mb-10 inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aac-icon-96.png" alt="" width={40} height={40} className="h-10 w-10" />
          <span className="font-display text-[1.25rem] text-[var(--color-text-display)]">
            All Against Cancer <span className="text-[0.72em] opacity-70">Initiative</span>
          </span>
        </Link>

        {state === "sent" ? (
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-8">
            <p className="mono mb-4">Check your email</p>
            <h1 className="display text-[1.75rem]">We have sent you a link.</h1>
            <p className="mt-4 text-body leading-body text-[var(--color-text-secondary)]">
              Open the email we just sent to <strong className="text-[var(--color-text-primary)]">{email}</strong> and
              click the link to sign in. It expires in an hour.
            </p>
            <p className="mt-4 text-caption text-[var(--color-text-secondary)]">
              Nothing arrived? Check spam, then{" "}
              <button
                type="button"
                onClick={() => setState("idle")}
                className="text-[var(--color-text-emphasis)] underline underline-offset-4"
              >
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-8">
            <h1 className="display text-[1.75rem]">Sign in.</h1>
            <p className="mt-3 text-caption leading-body text-[var(--color-text-secondary)]">
              For AAC staff, coordinators and content leads. Accounts are created by invitation.
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="mono mb-2 block">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-page)] px-4 py-3 text-body text-[var(--color-text-primary)] outline-none focus-visible:border-[var(--color-border-brand)]"
                  placeholder="you@aaci.ngo"
                />
              </div>

              {mode === "password" && (
                <div>
                  <label htmlFor="password" className="mono mb-2 block">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-page)] px-4 py-3 text-body text-[var(--color-text-primary)] outline-none focus-visible:border-[var(--color-border-brand)]"
                  />
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-[var(--color-feedback-danger-base)] bg-[var(--color-feedback-danger-surface)] px-4 py-3 text-caption text-[var(--color-feedback-danger-text)]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={state === "sending"}
                className="group inline-flex min-h-[44px] w-full items-center justify-center gap-3 rounded-pill bg-[var(--color-action-primary)] px-6 py-3 text-body font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)] disabled:opacity-50"
              >
                {state === "sending"
                  ? "Working…"
                  : mode === "link"
                    ? "Email me a sign-in link"
                    : "Sign in"}
                {state !== "sending" && <ArrowRight className="h-[1.05em] w-[1.05em] transition-transform duration-hover ease-entrance group-hover:translate-x-1" />}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setMode(mode === "link" ? "password" : "link"); setError(null); }}
              className="mono mt-6 underline underline-offset-4"
            >
              {mode === "link" ? "Use a password instead" : "Email me a link instead"}
            </button>
          </div>
        )}

        <p className="mt-8 text-caption text-[var(--color-text-secondary)]">
          Not staff?{" "}
          <Link href="/" className="text-[var(--color-text-emphasis)] underline underline-offset-4">
            Back to the website
          </Link>
          . Problems signing in — write to{" "}
          <a href={`mailto:${ORG.email.general}`} className="text-[var(--color-text-emphasis)] underline underline-offset-4">
            {ORG.email.general}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
