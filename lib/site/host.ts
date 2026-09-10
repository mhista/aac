/**
 * Working out which campus a request is for, from its hostname.
 *
 * Pure string work, no database, no imports — because this runs in middleware
 * on the edge, where a query would add a round trip to every single request
 * including static assets.
 */

/** Hostnames that are the main site, not a campus. */
const NOT_A_CAMPUS = new Set(["www", "aaci", "aac"]);

/**
 * The campus label in a hostname, or null for the main site.
 *
 *   unn.aaci.ngo        → "unn"
 *   aaci.ngo            → null
 *   www.aaci.ngo        → null
 *   unn.localhost:3000  → "unn"
 *   localhost:3000      → null
 *   aac-git-x.vercel.app → null   (preview builds are the main site)
 *
 * Deliberately conservative: anything it cannot read confidently comes back as
 * null, and null means "show AAC". A wrong guess in the other direction would
 * silently serve one campus's front page to everybody.
 */
export function campusFromHost(host: string | null | undefined): string | null {
  if (!host) return null;

  const name = host.split(":")[0].toLowerCase().replace(/\.$/, "");
  if (!name || name === "localhost") return null;

  /* An IP address has no subdomain to read. */
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name)) return null;

  const parts = name.split(".");

  /* Vercel gives every deployment its own hostname —
     aac-git-main-team.vercel.app. Those are the main site, not a campus
     called "aac-git-main-team". */
  if (name.endsWith(".vercel.app")) return null;

  /* unn.localhost — how campus sites are reached in development. */
  if (parts.length === 2 && parts[1] === "localhost") {
    return NOT_A_CAMPUS.has(parts[0]) ? null : parts[0];
  }

  /* aaci.ngo is two labels; a campus is three or more. Anything deeper than
     one level (a.b.aaci.ngo) is not something we hand out, so it reads as the
     main site rather than as a campus named "a". */
  if (parts.length !== 3) return null;

  const label = parts[0];
  if (NOT_A_CAMPUS.has(label)) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(label)) return null;

  return label;
}

/** The header middleware uses to tell the app which campus it resolved. */
export const CAMPUS_HEADER = "x-aac-campus";
