# Sign-in emails

Supabase keeps these in a textarea in its dashboard, where they are invisible
to code review and lost the moment somebody edits them badly. They live here so
there is a copy that is version-controlled and can be pasted back.

## The problem these fix

Only the link was arriving; the six-digit code never was.

Supabase generates a code for **every** sign-in request whether you ask for one
or not — but the stock template prints only `{{ .ConfirmationURL }}`, so the
code is created and then thrown away unseen. Nothing in the application was
wrong: `signInWithOtp` was sending it and `verifyOtp` was ready to check it.
Adding `{{ .Token }}` to the template is the entire fix.

## Installing them

Supabase dashboard → **Authentication → Emails**.

| File | Paste into | Subject |
|---|---|---|
| `magic-link.html` | **Magic Link** | Your AAC sign-in code |
| `confirm-signup.html` | **Confirm signup** | Your AAC sign-in code |

**Do both.** Supabase chooses the template by whether the address already has
an account: an existing user gets *Magic Link*, a first-time user gets *Confirm
signup*. In this project every newly invited coordinator is a first-time user,
because accounts are created on first sign-in by the invitation trigger
(migration 006).

Fixing only the first one gives a convincing false result — you test with your
own account, the code arrives, it looks mended, and the next new coordinator
gets a link and no code exactly as before.

## Why the code comes first in the layout

A link in an email is fragile in ways a code is not. Corporate and webmail
scanners fetch every URL in a message before the recipient sees it, and a magic
link is single-use — so by the time the coordinator clicks, it has already been
spent. That is the "email link is invalid or has expired" this project kept
hitting.

A typed code cannot be consumed by a scanner, does not care which browser the
email was opened in, and does not depend on the PKCE verifier cookie. So it is
the headline and the link is the convenience.

## Checking it worked

Sign in with an address that **already has an account** — the code should
arrive. Then sign in with an address that has **never** signed in before, and
confirm the code arrives there too. Those are two different templates.

## Related settings

- **Authentication → Sign In / Providers → Email → Email OTP expiration** —
  one hour by default, and it governs magic links too.
- A user may request a code only once every 60 seconds.
- Supabase's built-in SMTP is rate-limited and not for production. With 40+
  coordinators signing in, set **Custom SMTP** (Zoho, since the domain already
  sends through it) or the invitation emails will start silently failing.
