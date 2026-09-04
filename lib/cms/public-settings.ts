import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { ORG } from "@/lib/org";

/**
 * Site settings for the PUBLIC site.
 *
 * Deliberately not the same reader the dashboard uses. That one goes through
 * the cookie-aware Supabase client, and calling it from the root layout would
 * make every page on the site dynamic — the whole marketing site would lose
 * static rendering to fetch one row that changes twice a year.
 *
 * So this uses a plain anon client with no cookies (site_settings is publicly
 * readable by policy, so no session is needed) wrapped in a cache with a tag.
 * Saving in the dashboard revalidates that tag, so edits still appear
 * promptly, but a visitor never pays for the lookup.
 *
 * Everything falls back to lib/org.ts. A missing row, an unreachable database
 * or an empty field yields the coded default rather than a blank in the
 * footer.
 */

export const SETTINGS_TAG = "site-settings";

export interface PublicSettings {
  name: string;
  abbr: string;
  tagline: string;
  registration: { body: string; number: string; country: string };
  email: { general: string; support: string };
  social: { name: string; url: string; profile: boolean }[];
}

async function read(): Promise<PublicSettings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const fallback: PublicSettings = {
    name: ORG.name,
    abbr: ORG.abbr,
    tagline: ORG.tagline,
    registration: {
      body: ORG.registration.body,
      number: ORG.registration.number,
      country: ORG.registration.country,
    },
    email: { general: ORG.email.general, support: ORG.email.support },
    social: ORG.social,
  };

  if (!url || !key) return fallback;

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await db
      .from("site_settings")
      .select("org,contact,socials")
      .eq("id", 1)
      .maybeSingle();

    if (!data) return fallback;

    const org = (data.org ?? {}) as Record<string, string>;
    const contact = (data.contact ?? {}) as Record<string, string>;
    const socials = (data.socials ?? {}) as Record<string, string>;

    return {
      name: org.name || fallback.name,
      abbr: org.abbr || fallback.abbr,
      tagline: org.tagline || fallback.tagline,
      registration: {
        body: org.registrationBody || fallback.registration.body,
        number: org.registrationNumber || fallback.registration.number,
        country: org.country || fallback.registration.country,
      },
      email: {
        general: contact.general || fallback.email.general,
        support: contact.support || fallback.email.support,
      },
      /* Keyed by platform in the database; the coded list supplies the display
         names and ordering, so "linkedin" still renders as "LinkedIn". */
      social: Object.keys(socials).length
        ? ORG.social
            .map((s) => ({ ...s, url: socials[s.name.toLowerCase()] ?? s.url }))
            .filter((s) => s.url)
        : fallback.social,
    };
  } catch {
    return fallback;
  }
}

export const getPublicSettings = unstable_cache(read, ["public-site-settings"], {
  tags: [SETTINGS_TAG],
  /* An hour is the outer bound; the tag makes a dashboard save appear at once. */
  revalidate: 3600,
});
