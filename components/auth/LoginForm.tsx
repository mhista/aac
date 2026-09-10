"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient, CONFIG_ERROR } from "@/lib/supabase/client";
import { ArrowRight } from "@/components/ui/Icon";
import { ORG } from "@/lib/org";

/**
 * Sign in.
 *
 * Magic link by default — no password to forget, reuse or leak, which matters
 * when the people signing in are 40+ campus coordinators rather than engineers.
 * Password sign-in is offered as a fallback for accounts that have one set.
 */
/**
 * Why a sign-in attempt bounced. Each of these needs a different action from
 * the person, so none of them may collapse into "link expired".
 */
const REASONS: Record<string, string> = {
  otp_expired:
    "That link had already been used or has expired. Email scanners often open links before you do, so use the six-digit code instead — it cannot be consumed by a scanner.",
  exchange_failed:
    "This browser could not complete the sign-in. That usually means the email was opened in a different browser from the one that asked for it. Request a new link here, then use the six-digit code from the email.",
  no_code: "That link was incomplete. Please request a new one.",
  not_configured:
    "Sign-in is not configured on this server yet — NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
  provider: "The sign-in service refused that link. Please request a new one.",
  link_expired: "That link is no longer valid. Please request a new one.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const reason = params.get("error");

  const [mode, setMode] = useState<"link" | "password">("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(reason ? (REASONS[reason] ?? REASONS.link_expired) : null);

  /**
   * Verify the six-digit code from the email.
   *
   * This path does not use PKCE at all, so it does not depend on a verifier
   * cookie and cannot be broken by opening the email on another device or by
   * a scanner having touched the link first.
   */
  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError(null);

    const db = createClient();
    if (!db) { setVerifying(false); setError(CONFIG_ERROR); return; }
    const { error } = await db.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setVerifying(false);
    if (error) { setError(error.message); return; }
    router.push(next);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);

    const db = createClient();
    /* Unconfigured build. Say so rather than sitting on "Working…" for ever. */
    if (!db) { setError(CONFIG_ERROR); setState("error"); return; }

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

            {/* The typed code is the reliable path: a link can be consumed by
                a mail scanner or opened in the wrong browser, a code cannot. */}
            <form onSubmit={onVerifyCode} className="mt-6 border-t border-[var(--color-border-subtle)] pt-6">
              <label htmlFor="otp" className="mono mb-2 block">
                Or enter the six-digit code from that email
              </label>
              <div className="flex gap-2">
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-page)] px-4 py-3 text-body tracking-[0.3em] text-[var(--color-text-primary)] outline-none focus-visible:border-[var(--color-border-brand)]"
                />
                <button
                  type="submit"
                  disabled={code.length < 6 || verifying}
                  className="shrink-0 rounded-pill bg-[var(--color-action-primary)] px-6 text-body font-medium text-white transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)] disabled:opacity-50"
                >
                  {verifying ? "Checking…" : "Sign in"}
                </button>
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-md border border-[var(--color-feedback-danger-base)] bg-[var(--color-feedback-danger-surface)] px-4 py-3 text-caption text-[var(--color-feedback-danger-text)]"
                >
                  {error}
                </p>
              )}
            </form>

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
