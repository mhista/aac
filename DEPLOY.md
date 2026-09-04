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
