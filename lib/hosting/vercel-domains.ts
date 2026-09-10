/**
 * Registering a campus address with the host, from the dashboard.
 *
 * WHY THIS FILE EXISTS. Vercel will only issue a *wildcard* certificate for
 * `*.aaci.ngo` if it controls the domain's nameservers — the certificate
 * authority makes it prove ownership with a DNS record, and Vercel can only
 * write that record if it runs the DNS. Handing Vercel the nameservers would
 * take DNS off Cloudflare, and with it every Zoho mail record: contact@ and
 * support@aaci.ngo would stop receiving mail until they were rebuilt
 * elsewhere. Email is not worth trading for a certificate.
 *
 * So no wildcard. Each campus address is registered with Vercel individually,
 * which needs no wildcard certificate and therefore no nameserver change.
 * Cloudflare stays authoritative, Zoho keeps working, and the addresses stay
 * short: unn.aaci.ngo, not unn.chapters.aaci.ngo.
 *
 * Two things make that a single API call rather than a chore:
 *
 *  · One wildcard CNAME in Cloudflare (`*` → cname.vercel-dns.com, DNS only)
 *    means every possible subdomain already resolves to Vercel. That is set up
 *    once and never touched again.
 *  · This file tells Vercel to answer for a specific one, which is what makes
 *    it a real site with its own certificate instead of a 404.
 *
 * FAILURE IS NOT FATAL, BY DESIGN. If the token is missing, expired, or Vercel
 * is having a bad afternoon, the chapter's row is still saved and the caller is
 * told plainly what did not happen. The alternative — refusing to save because
 * a third-party API call failed — would leave someone unable to finish a task
 * for a reason they cannot act on.
 */

const API = "https://api.vercel.com";

export type HostingResult =
  | { attempted: false }
  | { attempted: true; ok: true; note?: string }
  | { attempted: true; ok: false; error: string };

function config() {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  const team = process.env.VERCEL_TEAM_ID;
  if (!token || !project) return null;
  return { token, project, team };
}

/** True when this deployment can register addresses itself. */
export function hostingConfigured(): boolean {
  return config() !== null;
}

function url(path: string, team?: string) {
  return team ? `${API}${path}${path.includes("?") ? "&" : "?"}teamId=${team}` : `${API}${path}`;
}

async function call(
  path: string,
  init: RequestInit,
  cfg: NonNullable<ReturnType<typeof config>>
): Promise<{ status: number; body: any }> {
  const res = await fetch(url(path, cfg.team), {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    /* A hung API call must not hold a form submission open indefinitely. */
    signal: AbortSignal.timeout(12_000),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** Turn whatever went wrong into something an admin can act on. */
function explain(status: number, body: any, host: string): string {
  const code = body?.error?.code ?? "";
  const message = body?.error?.message ?? `HTTP ${status}`;

  if (status === 403 || code === "forbidden") {
    return "The hosting token was refused. It may have expired or been revoked — an admin needs to replace VERCEL_TOKEN.";
  }
  if (code === "domain_already_in_use" || code === "domain_taken") {
    return `${host} is already registered to a different project on the hosting account. Remove it there first.`;
  }
  if (code === "not_found" || status === 404) {
    return "The hosting project could not be found. Check VERCEL_PROJECT_ID (and VERCEL_TEAM_ID if the project belongs to a team).";
  }
  if (status === 429) {
    return "The hosting API is rate-limiting us. Wait a minute and switch the site on again.";
  }
  return message;
}

/**
 * Make `host` a live address on this project.
 *
 * Idempotent: a host that is already registered counts as success, because the
 * end state an admin asked for is the one that now exists.
 */
export async function claimHost(host: string): Promise<HostingResult> {
  const cfg = config();
  if (!cfg) return { attempted: false };

  try {
    const { status, body } = await call(
      `/v10/projects/${encodeURIComponent(cfg.project)}/domains`,
      { method: "POST", body: JSON.stringify({ name: host }) },
      cfg
    );

    if (status >= 200 && status < 300) {
      /* Vercel begins issuing the certificate immediately, but it is not
         instant. Saying so beats an admin opening the address, seeing a
         warning, and assuming it is broken. */
      return {
        attempted: true,
        ok: true,
        note: body?.verified === false
          ? "Registered. The security certificate takes a minute or two — until then the address may show a warning."
          : undefined,
      };
    }

    /* Already ours. Not an error: the address works. */
    if (body?.error?.code === "domain_already_in_use_by_this_project") {
      return { attempted: true, ok: true };
    }

    return { attempted: true, ok: false, error: explain(status, body, host) };
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      attempted: true,
      ok: false,
      error: timedOut
        ? "The hosting API did not answer in time. The address may still have been registered — switch the site on again to check."
        : "Could not reach the hosting API. Check the server's internet connection.",
    };
  }
}

/**
 * Stop answering for `host`.
 *
 * Only the project association is removed, never the domain from the account —
 * deleting `aaci.ngo` itself because somebody closed one chapter's site would
 * take the whole organisation offline.
 */
export async function releaseHost(host: string): Promise<HostingResult> {
  const cfg = config();
  if (!cfg) return { attempted: false };

  try {
    const { status, body } = await call(
      `/v9/projects/${encodeURIComponent(cfg.project)}/domains/${encodeURIComponent(host)}`,
      { method: "DELETE" },
      cfg
    );

    /* Already gone is the state we wanted. */
    if ((status >= 200 && status < 300) || status === 404) {
      return { attempted: true, ok: true };
    }
    return { attempted: true, ok: false, error: explain(status, body, host) };
  } catch {
    return {
      attempted: true,
      ok: false,
      error:
        "Could not reach the hosting API, so the address may still be live. The campus site itself is switched off either way — nothing of the chapter's is being served.",
    };
  }
}
