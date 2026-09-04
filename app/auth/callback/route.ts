import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Exchanges the code for a session, then continues on.
 *
 * This route used to collapse every failure into "link_expired", which hid the
 * difference between three unrelated problems: the link having genuinely
 * expired, the link having already been consumed (mail scanners fetch every
 * URL in an email before the person sees it), and the PKCE exchange failing
 * because the verifier cookie is missing — which happens whenever the email is
 * opened in a different browser from the one that requested it.
 *
 * They need different answers from the person, so they now get different
 * messages, and the real provider error is logged server-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${reason}&next=${encodeURIComponent(next)}`);

  /* Supabase reports its own failures on the query string before we ever get
     a code — an expired or already-used link arrives this way. */
  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) {
    console.error("[auth/callback] provider error:", {
      error: searchParams.get("error"),
      code: searchParams.get("error_code"),
      description: searchParams.get("error_description"),
    });
    return fail(providerError === "otp_expired" ? "otp_expired" : "provider");
  }

  if (!code) return fail("no_code");

  const db = await createClient();
  if (!db) {
    console.error("[auth/callback] Supabase is not configured — check NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return fail("not_configured");
  }

  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message, error);
    /* The overwhelmingly common cause is a missing PKCE verifier cookie. */
    return fail("exchange_failed");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
