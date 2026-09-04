#!/usr/bin/env node
/**
 * Upload the seeded editorial images to ImageKit.
 *
 *   npm run upload:images            # upload anything missing
 *   npm run upload:images -- --force # re-upload and overwrite everything
 *   npm run upload:images -- --list  # just show what's already there
 *
 * Reads IMAGEKIT_PRIVATE_KEY from .env.local — never hardcode it, never commit it.
 *
 * Files upload to the ImageKit root with their exact filenames, because
 * lib/media/imagekit.ts builds URLs as:
 *     {endpoint}/tr:{transforms}/{filename}
 * Renaming or foldering them here would break every image on the site.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG_DIR = join(ROOT, "public", "img");
const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const LIST_URL = "https://api.imagekit.io/v1/files";

/* ── Load .env.local without a dependency ─────────────────────────────── */
function loadEnv() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error(
    "\n  ✗ IMAGEKIT_PRIVATE_KEY is not set.\n" +
      "    Add it to web/.env.local:\n\n" +
      "      IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxx\n\n" +
      "    Get it from ImageKit → Developer options → API keys.\n" +
      "    Never commit this file.\n"
  );
  process.exit(1);
}

const auth = "Basic " + Buffer.from(`${PRIVATE_KEY}:`).toString("base64");
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const LIST_ONLY = args.includes("--list");

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

/* ── What's already uploaded ──────────────────────────────────────────── */
async function listRemote() {
  const res = await fetch(`${LIST_URL}?limit=1000`, { headers: { Authorization: auth } });
  if (!res.ok) {
    throw new Error(`List failed (${res.status}). Check the private key is correct and not rotated.`);
  }
  const files = await res.json();
  return new Map(files.map((f) => [f.name, f]));
}

/* ── Upload one file ──────────────────────────────────────────────────── */
async function upload(name, buf) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: MIME[extname(name).toLowerCase()] ?? "image/jpeg" }), name);
  form.append("fileName", name);
  form.append("useUniqueFileName", "false"); // exact names — the site depends on them
  form.append("overwriteFile", "true");
  form.append("folder", "/");
  form.append("tags", "aac,website,seed");
  /* No customMetadata: ImageKit rejects any field that has not been declared
     first under Media Library → Custom metadata fields, and returns a flat
     "Invalid custom metadata." Alt text already lives in lib/media/manifest.json
     and will live on media_assets once the CMS exists, so it is not needed here. */

  const res = await fetch(UPLOAD_URL, { method: "POST", headers: { Authorization: auth }, body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json;
}

/* ── Run ──────────────────────────────────────────────────────────────── */
(async () => {
  const remote = await listRemote();

  if (LIST_ONLY) {
    console.log(`\n  ${remote.size} file(s) on ImageKit:\n`);
    for (const [name, f] of remote) {
      console.log(`    ${name.padEnd(34)} ${String(Math.round(f.size / 1024)).padStart(5)}KB  ${f.width}x${f.height}`);
    }
    console.log();
    return;
  }

  const local = readdirSync(IMG_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (local.length === 0) {
    console.error(`  ✗ No images found in ${IMG_DIR}`);
    process.exit(1);
  }

  console.log(`\n  ${local.length} local · ${remote.size} remote · ${FORCE ? "force re-upload" : "uploading missing only"}\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const name of local) {
    if (!FORCE && remote.has(name)) {
      console.log(`  ·  ${name.padEnd(34)} already uploaded`);
      skipped++;
      continue;
    }
    try {
      const buf = readFileSync(join(IMG_DIR, name));
      const r = await upload(name, buf);
      console.log(`  ✓  ${name.padEnd(34)} ${String(Math.round(buf.length / 1024)).padStart(5)}KB → ${r.filePath}`);
      done++;
    } catch (err) {
      console.error(`  ✗  ${name.padEnd(34)} ${err.message}`);
      failed++;
    }
  }

  console.log(`\n  ${done} uploaded · ${skipped} skipped · ${failed} failed\n`);
  if (done > 0) {
    const ep = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "https://ik.imagekit.io/aac";
    console.log(`  Verify one:\n  ${ep}/tr:w-640,q-80,f-auto/${local[0]}\n`);
  }
  if (failed > 0) process.exit(1);
})().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
