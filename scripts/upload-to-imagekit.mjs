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
import { setDefaultResultOrder, promises as dns } from "node:dns";
import { connect } from "node:net";

/* Prefer IPv4.
 *
 * The single most common cause of "Connect Timeout Error" on a home or mobile
 * connection is a network that advertises IPv6 but cannot actually route it.
 * Node asks DNS, gets an AAAA record back, tries it, and waits for a reply
 * that will never come. Asking for IPv4 addresses first sidesteps the whole
 * problem and costs nothing on a network where IPv6 does work. */
setDefaultResultOrder("ipv4first");

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
const DOCTOR = args.includes("--doctor");

/* ── Retry ────────────────────────────────────────────────────────────
   Node's fetch gives up on a TCP connection after ten seconds and that limit
   cannot be raised without pulling in a dependency. On a connection that is
   merely slow rather than blocked, one more attempt usually succeeds — so try
   three times with a widening gap before concluding anything is wrong.

   Only connection-level failures are retried. A 401 from a wrong key will be
   just as wrong the third time. */
const TRANSIENT = new Set([
  "UND_ERR_CONNECT_TIMEOUT", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENETUNREACH",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(label, fn, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const code = err?.cause?.code ?? err?.code;
      if (i >= attempts || !TRANSIENT.has(code)) throw err;
      const wait = i * 3000;
      console.error(`  …  ${label} — ${code}, retrying in ${wait / 1000}s (${i}/${attempts - 1})`);
      await sleep(wait);
    }
  }
}

/* ── Doctor ───────────────────────────────────────────────────────────
   Separates the three things a connect timeout can mean, which the error
   itself does not: DNS is broken, the route is blocked, or it is just slow.
   Each has a different fix, and guessing between them wastes an afternoon. */
async function doctor() {
  const hosts = ["api.imagekit.io", "upload.imagekit.io"];
  console.log("\n  Checking the connection to ImageKit\n");

  let anyReachable = false;
  let anyResolved = false;

  for (const host of hosts) {
    console.log(`  ${host}`);

    let v4 = [], v6 = [];
    try {
      v4 = await dns.resolve4(host);
    } catch (e) {
      console.log(`    DNS (IPv4)  ✗  ${e.code ?? e.message}`);
    }
    try {
      v6 = await dns.resolve6(host);
    } catch {
      /* No AAAA record is perfectly normal. Not worth reporting. */
    }

    if (v4.length) console.log(`    DNS (IPv4)  ✓  ${v4.slice(0, 3).join(", ")}`);
    if (v6.length) console.log(`    DNS (IPv6)  ·  ${v6.slice(0, 2).join(", ")}`);

    if (!v4.length && !v6.length) {
      console.log("    → DNS cannot resolve this name at all.\n");
      continue;
    }
    anyResolved = true;

    for (const ip of [...v4.slice(0, 2), ...v6.slice(0, 1)]) {
      const started = Date.now();
      const reached = await new Promise((resolve) => {
        const sock = connect({ host: ip, port: 443, timeout: 8000 });
        const done = (ok) => {
          sock.destroy();
          resolve(ok);
        };
        sock.once("connect", () => done(true));
        sock.once("timeout", () => done(false));
        sock.once("error", () => done(false));
      });
      const ms = Date.now() - started;
      console.log(`    TCP ${ip.padEnd(24)} ${reached ? `✓  ${ms}ms` : `✗  no answer in ${ms}ms`}`);
      if (reached) anyReachable = true;
    }
    console.log();
  }

  const FALLBACK =
    "\n  You are not blocked on this. ImageKit only makes the images load faster;\n" +
    "  the site works without it. If production is showing the wrong crop, remove\n" +
    "  NEXT_PUBLIC_IMAGEKIT_ENABLED from the hosting environment variables and\n" +
    "  redeploy — production then serves /public/img, exactly like development.\n";

  if (anyReachable) {
    console.log(
      "  DNS works and port 443 answered, so the network is fine.\n" +
        "  The earlier timeout was most likely a slow moment — run the upload again.\n"
    );
    return;
  }

  if (!anyResolved) {
    console.log(
      "  DNS could not resolve ImageKit's hostnames, so nothing else was\n" +
        "  reachable either. This is a name-resolution problem, not a firewall one:\n\n" +
        "    1. Check the machine is online at all — open any website.\n" +
        "    2. If other sites work, the DNS server is the problem. Switch the\n" +
        "       adapter's DNS to 1.1.1.1 and 1.0.0.1, or use a phone hotspot.\n" +
        "    3. A VPN that is half-connected does this too. Disconnect it fully.\n" +
        FALLBACK
    );
    return;
  }

  console.log(
    "  The names resolved but nothing answered on port 443.\n\n" +
      "  That combination points at something blocking the connection rather than\n" +
      "  the connection being down — if the network were off, the DNS lookups above\n" +
      "  would have failed too. In order of likelihood:\n\n" +
      "    1. A VPN or proxy is on. Turn it off and try again.\n" +
      "    2. Antivirus or firewall web-shield is intercepting HTTPS.\n" +
      "    3. The ISP is blocking or misrouting ImageKit. Try a phone hotspot —\n" +
      "       if it works there, this is it.\n" +
      FALLBACK
  );
}

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
  if (DOCTOR) {
    await doctor();
    return;
  }

  const remote = await withRetry("connecting", listRemote);

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
      const r = await withRetry(name, () => upload(name, buf));
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
  /* Node's fetch reports every connection-level problem as the single word
     "fetch failed" and hides the real reason in err.cause. Printing only the
     message turns a diagnosable network fault into a mystery, so unwrap it. */
  const cause = err?.cause;
  const code = cause?.code ?? cause?.errno;

  console.error(`\n  ✗ ${err.message}`);
  if (cause?.message && cause.message !== err.message) {
    console.error(`    ${cause.message}`);
  }

  const HINT = {
    ENOTFOUND:
      "DNS could not resolve api.imagekit.io. Usually no internet, or a DNS\n" +
      "    server that is not answering. Try `ping api.imagekit.io`.",
    EAI_AGAIN:
      "DNS lookup timed out — the connection is up but name resolution is\n" +
      "    failing. Common on a flaky mobile hotspot. Try again, or switch DNS\n" +
      "    to 1.1.1.1.",
    ECONNREFUSED: "Something refused the connection — usually a local proxy or firewall.",
    ETIMEDOUT: "The connection timed out. A firewall or captive portal is likely blocking it.",
    ECONNRESET: "The connection was cut mid-request. Often TLS interception by antivirus or a corporate proxy.",
    UND_ERR_CONNECT_TIMEOUT:
      "The name resolved but nothing answered on port 443 — the connection is\n" +
      "    being blocked or misrouted rather than being down.\n\n" +
      "    Run `npm run images:doctor` to find out which.",
    UNABLE_TO_VERIFY_LEAF_SIGNATURE:
      "The TLS certificate could not be verified — antivirus or a corporate\n" +
      "    proxy is intercepting HTTPS.",
    CERT_HAS_EXPIRED: "A certificate in the chain has expired. Check the computer's clock.",
  }[code];

  if (code) console.error(`    (${code})`);
  if (HINT) console.error(`\n    ${HINT}`);

  if (!code) {
    console.error(
      "\n    No network error code came back. If you are online, check whether a\n" +
        "    VPN or firewall is blocking api.imagekit.io."
    );
  }

  console.error(
    "\n    Nothing was uploaded, so nothing is half-done.\n\n" +
      "    THIS IS NOT BLOCKING. ImageKit only serves the images faster; the site\n" +
      "    works without it by serving /public/img, which is what development\n" +
      "    already does. If production is showing the wrong crop, the quickest fix\n" +
      "    is to remove NEXT_PUBLIC_IMAGEKIT_ENABLED from the hosting environment\n" +
      "    variables and redeploy — production then matches development exactly.\n"
  );
  process.exit(1);
});
