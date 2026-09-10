# All Against Cancer Initiative

The website and content system for **All Against Cancer Initiative (AAC)** — a
cancer NGO registered in Nigeria (CAC RN 9812183) working across Nigeria, Ghana
and Kenya, through awareness, patient support, medication access, research,
education and a network of university chapters.

*Bringing Hope through Awareness, Support and Research.*

**Live:** [aaci.ngo](https://aaci.ngo) · **Contact:** contact@aaci.ngo ·
**Patient support:** support@aaci.ngo

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase ·
ImageKit · Vercel

---

## What this is

Two things in one codebase, deliberately.

**A public website** — the organisation's pages, its events with photographs,
a blog, programmes, the chapter network, and the form people join through.

**A dashboard** the organisation runs itself. Everyone who edits this site is a
pharmacist, a student or a coordinator, not a developer. Nobody is ever asked
for a URL, a slug, an image CDN path, or anything else that is an
implementation detail leaking into their day. That constraint drove most of the
decisions here — direct browser uploads instead of pasting ImageKit URLs, a
suggested subdomain instead of a DNS record, an import that previews before it
writes.

**Every chapter can have its own site.** A campus coordinator's events and
articles appear at `theircampus.aaci.ngo`; admins and content leads decide
which of them also appear on the main site. One codebase, one database, no
copies — see *Campus sites* below.

---

## Run it

```bash
npm install
cp .env.example .env.local     # fill in the keys
npm run dev
```

The site runs with **no credentials at all**. Without Supabase, every CMS query
returns an empty array and the pages render their empty states; without
ImageKit, images are served from `public/img`. You will not see a stack trace
because a key is missing.

```bash
npm run verify        # the export rule + typecheck. Run before pushing.
npm run typecheck
npm run lint
```

### Campus sites in development

Campus subdomains work locally at `http://unn.localhost:3000` in Chrome, Edge
and Safari with no hosts-file edit. Firefox needs an entry in `hosts`.

---

## The rules

These are not style preferences. Each one exists because breaking it caused a
real problem.

**No demo data, ever.** Every query in `lib/cms` returns real Supabase rows or
an empty array. A section with nothing to show renders its designed empty state
or returns `null` and disappears. A missing CMS must never take the site down.

**Never invent a figure.** The impact numbers in `lib/org.ts` are real,
supplied by AAC, and dated. They seed the site so the impact section is
truthful from day one; the moment a row exists in `impact_metrics`, the CMS
wins. Do not round 5 up to "5+".

**The legacy name is never reproduced.** Older collateral says "Africa Against
Cancer" / "African Against Cancer". The registered name is *All Against Cancer
Initiative*. The old `africa.against.cancer` Gmail address is legacy and must
never appear.

**RLS is the security boundary.** `lib/auth/capabilities.ts` decides what the
interface offers; Postgres decides what actually happens, and the two are kept
identical on purpose. Where they disagree the database wins and the person sees
an error. Never rely on hiding a button.

**A `"use server"` module may export only async functions.** Exporting a
constant from one is a runtime error at import time that TypeScript does not
catch. `npm run check:server` does, and it runs as part of `npm run verify`.

**Tokens, not magic numbers.** `tailwind.config.ts` and the `:root` block in
`app/globals.css` are generated from `../Figma design request/tokens/aac.tokens.json`.
That JSON is the contract — regenerate rather than hand-editing. Two tiers:
primitives underneath, semantic aliases (`--color-action-primary`) in product
code.

> Tailwind v4 arbitrary values need underscores around calc operators —
> `calc(100svh_-_3.5rem)`. Without them the declaration is silently dropped.

---

## Structure

```
app/
  (public routes)      about, events, blog, programmes, get-involved, join, …
  dashboard/           the CMS/CRM. Own chrome, no marketing header
  api/, auth/          route handlers and the Supabase callback
components/
  ui/                  Button, Nav, Footer, CampusBar, forms
  sections/            one file per CMS-toggleable homepage block
  media/               Img, Avatar, HeroMedia (image OR autoplay video)
  motion/              Reveal, Stagger, SmoothScroll
  dashboard/           editors, managers, Toast, filters
lib/
  org.ts               verified organisation facts + real impact figures
  cms/                 data layer and server actions
  auth/                roles, the capability matrix, reach rules
  site/                which campus a request is for
  media/               ImageKit URL builder + seeded image manifest
  hosting/             registers campus addresses with Vercel
  advocates/form.ts    the application, defined once
supabase/migrations/   numbered, run in order
scripts/               image upload, the server-export check
```

---

## Database

Migrations are plain SQL, numbered, and run in order in the Supabase SQL
editor. They are written to be re-runnable.

| | |
|---|---|
| `001`–`003` | Schema, row-level security, seed |
| `004`–`008` | Waitlist, team, invitations, delete policies |
| `009` | **Capability alignment** — closes a hole where a campus coordinator could edit the national board through the API |
| `010`, `011` | Zones. **Run 010 on its own** — Postgres cannot use a new enum value in the transaction that added it |
| `012` | Leadership section on the homepage |
| `013` | **Campus sites** — subdomains, per-chapter content scoping, campus executives |
| `014` | **Advocates** — matches the Google Forms question for question |

### Roles

Eleven, by rank: `super_admin` 100 · `board_member` 90 · `admin` 80 ·
`department_director` 70 · `regional_coordinator` 60 · `zonal_coordinator` 55 ·
`campus_coordinator` 50 · `content_lead` 40 · `contributor` 35 · `advocate` 30 ·
`viewer` 10.

Rank alone cannot describe this organisation — a content lead (40) must reach
the blog, a campus coordinator (50) outranks them numerically and must never
touch the national board. So permission is an explicit matrix per area, not a
threshold, mirrored line for line between `lib/auth/capabilities.ts` and
`009_capabilities.sql`.

Board members are the standing exception: they read everything and write
nothing.

---

## Campus sites

`chapter_id` says who **owns** a piece of content. `is_featured` says whether
the organisation has chosen to put it on the main site as well.

```
chapter_id IS NULL   →  AAC's own. Lives on aaci.ngo.
chapter_id = X       →  belongs to campus X. Lives on X's subdomain.
is_featured = true   →  additionally on aaci.ngo, whoever owns it.
```

Two flags rather than a copy: cross-posting by duplicating a row means two
records drifting apart, and nobody able to say which is real.

No route is duplicated. Middleware reads the hostname and writes a header;
`lib/site/campus.ts` turns it into a chapter; the CMS layer filters every query
by it. `/events` renders AAC's events on `aaci.ngo` and Nsukka's on
`unn.aaci.ngo` because the data underneath changed and nothing else did.

RLS decides who may **edit** a row. It cannot decide where a row **appears** —
Postgres does not know which hostname asked — so that filter lives in the query
layer, and published content stays publicly readable either way. Campus content
is not secret; it is somebody else's front page.

Creating a subdomain is a database row plus one Vercel API call. There is no
per-chapter DNS record. See `DEPLOY.md` § 4b — and do **not** accept Vercel's
prompt to take over the nameservers; that would move DNS off Cloudflare and
take the Zoho email with it.

---

## Images

Masters live in `public/img` at high quality; ImageKit handles delivery
(AVIF/WebP, responsive srcset, roughly 60–120KB in the browser). Every image
carries alt text and a 20px LQIP for blur-up, so CLS is zero.

Delivery through the CDN is **opt-in**, because an endpoint set before the
files exist means every image 404s while looking correctly configured:

```bash
npm run upload:images            # upload anything missing
npm run upload:images -- --force # re-upload and overwrite
npm run images:list              # what is already there
npm run images:doctor            # diagnose a connection failure
```

Then set `NEXT_PUBLIC_IMAGEKIT_ENABLED=true`. Until then the site serves
`/img` paths, which works fine — it is just not CDN-optimised.

Dashboard uploads go straight from the browser to ImageKit using a signed
token, with optional client-side compression. Nobody is asked for a URL.

---

## Environment

`NEXT_PUBLIC_*` variables are **inlined at build time**, not read at runtime —
adding one to the hosting environment requires a redeploy before it takes
effect.

| | |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin. Campus subdomains are derived from it |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Public by design; RLS is the boundary |
| `SUPABASE_SERVICE_ROLE_KEY` | Server route handlers only. Never import into a client component |
| `NEXT_PUBLIC_IMAGEKIT_ENABLED` / `_URL_ENDPOINT` | CDN delivery |
| `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` | Signs browser upload tokens |
| `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` | Lets the dashboard register campus addresses |
| `RESEND_API_KEY` / `EMAIL_FROM` | Invitations and batch email |
| `GROQ_API_KEY` | Chat assistant |

Everything except the Supabase pair degrades quietly when absent, and the
interface says what is missing rather than failing silently.

---

## Deploying

`DEPLOY.md` covers it end to end: GitHub, Vercel, environment variables, the
domain, campus subdomains, and the DNS trap worth knowing about before you hit
it.

---

## Still to build

Impact reports · the Groq chat assistant · a vector logo (SVG/EPS) ·
the volunteer handbook reissued without the legacy name.

---

## Licence

Copyright © All Against Cancer Initiative. All rights reserved.
The code is not currently offered under an open-source licence; the AAC name,
logo and written content are not licensed for reuse.
