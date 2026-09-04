# All Against Cancer Initiative — website

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase · ImageKit · Vercel

## Run

```bash
npm install
cp .env.example .env.local     # fill in the keys
npm run dev
```

## The one rule

**No demo data.** Every query in `lib/cms` returns real Supabase rows or an empty
array. Sections with no data render their designed empty state or return `null`.
Nothing on this site is invented, and a missing CMS never takes the site down.

Impact figures in `lib/org.ts` are the exception: they are real, supplied by AAC,
and dated. They seed the site so the impact section is truthful from day one. The
moment a row exists in `impact_metrics`, the CMS wins.

## Structure

```
app/                 routes (server components)
components/
  ui/                Button, Nav, Footer, Empty, SocialIcon
  sections/          one file per CMS-toggleable block
  media/             Img, HeroMedia (image OR autoplay video)
  motion/            Reveal, Stagger, SmoothScroll
lib/
  org.ts             verified org facts + real impact figures
  cms/               data layer — returns [] when the CMS isn't ready
  supabase/          server client (returns null when unconfigured)
  media/             ImageKit URL builder + seeded image manifest
```

## Tokens

`tailwind.config.ts` and the `:root` block in `app/globals.css` are **generated**
from `../Figma design request/tokens/aac.tokens.json`. That JSON is the contract —
regenerate rather than hand-editing. Two tiers: primitives underneath, semantic
aliases (`--color-action-primary`) used in product code.

## Images

Masters live in `public/img` at high quality; ImageKit handles delivery
compression (AVIF/WebP, responsive srcset — roughly 60–120KB per image in the
browser). Every image carries alt text and a 20px LQIP for blur-up, so CLS is zero.

Set `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` to serve via CDN; without it the app falls
back to local `/img` paths, so development works with no credentials at all.

## Still to build

Remaining public routes (`/about`, `/events`, `/blog`, `/programmes`,
`/get-involved/*`, `/support`, `/donate`, `/contact`, legal, 404/500), the chat
assistant, forms, and then the dashboard.
