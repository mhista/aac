import { headers } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CAMPUS_HEADER } from "./host";

/**
 * Which campus site the current request is being served as.
 *
 * The whole multi-tenancy of the public site hangs off this one function.
 * Middleware reads the hostname and writes the label into a header; this turns
 * that label into a chapter, and the CMS layer filters every query by it. No
 * route is duplicated, no page is copied — `/events` renders AAC's events on
 * aaci.ngo and Nsukka's events on unn.aaci.ngo, because the data underneath
 * changed and nothing else did.
 *
 * `cache()` is React's per-request memo: the lookup happens once even though a
 * page may ask for events, posts and people separately.
 */

export interface CampusSite {
  id: string;
  name: string;
  university: string;
  city: string | null;
  country: string;
  subdomain: string;
  headline: string | null;
  lede: string | null;
  hero: { url: string; alt: string } | null;
}

export const getCampus = cache(async (): Promise<CampusSite | null> => {
  let label: string | null = null;
  try {
    label = (await headers()).get(CAMPUS_HEADER);
  } catch {
    /* Rendered outside a request — a build-time page, or a script. That is
       the main site by definition. */
    return null;
  }
  if (!label) return null;

  const db = await createClient();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from("chapters")
      .select("id,name,university,city,country,subdomain,site_headline,site_lede,site_hero,site_enabled,status")
      .eq("subdomain", label)
      .limit(1)
      .maybeSingle();

    /* An unknown, switched-off or closed campus is not an error page — it is
       simply the main site. Someone typing a guessed subdomain, or visiting a
       chapter that has been wound down, lands on AAC rather than on a 404. */
    if (error || !data) return null;
    if (data.site_enabled !== true) return null;
    if (data.status === "closed") return null;

    return {
      id: data.id,
      name: data.name,
      university: data.university,
      city: data.city,
      country: data.country,
      subdomain: data.subdomain,
      headline: data.site_headline,
      lede: data.site_lede,
      hero: data.site_hero ?? null,
    };
  } catch {
    return null;
  }
});

/** The chapter id to filter by, or null on the main site. */
export async function currentChapterId(): Promise<string | null> {
  return (await getCampus())?.id ?? null;
}

/**
 * The canonical origin for whichever site is being served.
 *
 * Without this, every campus page would declare aaci.ngo as its canonical URL
 * and search engines would treat forty chapter sites as duplicates of one — the
 * exact problem the canonical tag exists to prevent, inverted.
 */
export function originFor(subdomain: string | null, base: string): string {
  if (!subdomain) return base;
  try {
    const u = new URL(base);
    u.hostname = `${subdomain}.${u.hostname.replace(/^www\./, "")}`;
    return u.origin;
  } catch {
    return base;
  }
}

export async function currentOrigin(base: string): Promise<string> {
  return originFor((await getCampus())?.subdomain ?? null, base);
}
