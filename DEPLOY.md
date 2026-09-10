# Deploying to Vercel

Once this is live I can load the URL myself, see what you see, and stop shipping
you guesses. This takes about five minutes.

---

## 1 · Put the code on GitHub

If you don't already have a repo:

```bash
cd C:\Users\user\Documents\aac\web
git init
git add .
git commit -m "AAC website — homepage"
```

Then create an empty repo on github.com (no README, no .gitignore) and:

```bash
git remote add origin https://github.com/YOUR-USERNAME/aac-website.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.next` and `.env*.local`, so your
keys will not be committed. Check that `.env.local` is **not** in the file list
before you push.

---

## 2 · Import into Vercel

1. Go to **vercel.com** → sign in with GitHub
2. **Add New → Project** → pick the repo → **Import**
3. Framework preset: **Next.js** (detected automatically)
4. Root directory: leave as `./` — but if you pushed the whole `aac` folder
   rather than just `web`, set it to `web`
5. Don't deploy yet — add the environment variables first (next step)

---

## 3 · Environment variables

In the import screen (or later under **Settings → Environment Variables**), add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://aaci.ngo` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dnlnmxwejbslyonhxxfb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `NEXT_PUBLIC_IMAGEKIT_ENABLED` | `false` for now — `true` after uploading |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/aac` |
| `IMAGEKIT_PRIVATE_KEY` | the **rotated** key |

Leave `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` and `RESEND_API_KEY` empty
until those features exist.

Then **Deploy**. You'll get a URL like `aac-website.vercel.app`.

---

## 4 · Point the domain at it

**Settings → Domains → Add** `aaci.ngo` and `www.aaci.ngo`. Vercel shows the DNS
records to create at your registrar — usually an `A` record to `76.76.21.21` and
a `CNAME` for `www` to `cname.vercel-dns.com`. Propagation is minutes to a few
hours. SSL is automatic.

Do this last — the `.vercel.app` URL is enough for review.

---

## 4b · Campus websites (`unn.aaci.ngo` and the rest)

Every chapter can have its own address. Once the three one-time steps below are
done, chapters are created entirely from the dashboard — Chapters → open a
chapter → *This chapter's own website* — with no visit to Cloudflare or Vercel.

### Do NOT accept Vercel's nameserver prompt

If you add `*.aaci.ngo` in Vercel, it shows **Invalid Configuration** and asks
you to change your nameservers to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`.

**Don't.** Nameservers decide which company answers *all* DNS questions for
`aaci.ngo`. Handing them to Vercel means Cloudflare stops being asked, and every
record in it goes dead — including the Zoho `MX`, `SPF`, `DKIM` and `DMARC`
records. `contact@aaci.ngo` and `support@aaci.ngo` would stop receiving mail
until they were rebuilt in Vercel's DNS.

Vercel insists on this only because a *wildcard* certificate has to be proved
with a DNS record that Vercel writes itself. So we don't use a wildcard
certificate. **Delete the `*.aaci.ngo` entry from Vercel → Domains.** The three
valid rows (`aaci.ngo`, `www.aaci.ngo`, `aac-plum.vercel.app`) stay as they are.

### Step 1 — one wildcard CNAME in Cloudflare

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `*` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

This makes every possible subdomain *resolve* to Vercel. It is added once and
never touched again. Cloudflare stays in charge of DNS, so Zoho is untouched.

> **Check your existing `*` record first.** There is already a wildcard `A`
> record pointing at `185.53.179.128` — a registrar parking address, not a web
> host. If it stays, every campus subdomain lands on a parking page. Delete it
> and add the CNAME above.
>
> Grey cloud matters: proxied through Cloudflare, Vercel cannot complete the
> certificate check and subdomains show SSL warnings.

### Step 2 — a hosting token, so the dashboard can finish the job

Resolving is not enough; Vercel also has to be told which specific addresses to
answer for, so each gets its own certificate. The dashboard does that over
Vercel's API when an admin switches a campus site on.

1. Vercel → account menu → **Settings → Tokens → Create**. Scope it to this
   project, give it no expiry (or diarise the renewal).
2. Vercel → project → **Settings → General**, copy the **Project ID**.
3. Add both under **Settings → Environment Variables**, Production:

```
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxx
# VERCEL_TEAM_ID=team_xxxx   ← only if the project belongs to a team, not "Somtech's projects"
```

4. Redeploy.

`VERCEL_TOKEN` can create and delete domains on the account. Treat it like a
password: never commit it, never paste it into a chat, and rotate it if it
leaks. It is only ever read on the server.

Until it is set, the dashboard says so plainly and still lets an admin name an
address — it just cannot make it live.

### Step 3 — check it

Open `anything.aaci.ngo`. You should get **the main AAC site** — an unrecognised
subdomain is deliberately treated as the main site, not an error. A parking
page means Step 1 is missing.

Then switch one real chapter's site on in the dashboard. It should report
*"Live at unn.aaci.ngo"*. The certificate takes a minute or two on first use.

### What this buys

- Cloudflare keeps DNS; Zoho email is never at risk.
- Addresses stay short: `unn.aaci.ngo`, not `unn.chapters.aaci.ngo`.
- Adding or closing a chapter site is one switch in the dashboard. Renaming an
  address releases the old one; deleting a chapter releases its address.

**Development.** Campus sites work locally at `unn.localhost:3000` in Chrome,
Edge and Safari with no hosts-file edit. Firefox needs a `hosts` entry. No token
is needed locally — only the database row matters.

---

## 5 · After that

Every `git push` to `main` deploys automatically. Every pull request gets its own
preview URL. Send me the URL and I can check my own work instead of asking you to.

---

## Uploading images to ImageKit

```bash
npm run upload:images     # needs IMAGEKIT_PRIVATE_KEY in .env.local
npm run images:list       # confirm what landed
```

Then set `NEXT_PUBLIC_IMAGEKIT_ENABLED=true` locally and in Vercel, and redeploy.
Until then the site serves images from `/public/img`, which works fine — it just
isn't CDN-optimised.
