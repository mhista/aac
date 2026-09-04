"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { canEdit } from "@/lib/auth/capabilities";
import { SETTINGS_TAG } from "./public-settings";

/**
 * Site settings.
 *
 * Everything here has a compile-time default in lib/org.ts. This table
 * overrides those defaults; it does not replace them. That ordering matters —
 * if the database is unreachable, or someone empties a field by accident, the
 * site falls back to a known-good value rather than rendering a blank where
 * the contact address should be.
 *
 * So a field left empty here means "use the default", never "show nothing".
 * The one thing that cannot be defaulted away is a wrong value someone typed
 * on purpose, which is why the registration number and the organisation's
 * legal name are validated rather than trusted.
 */

type Result = { ok: true; message?: string } | { ok: false; error: string };

type Guard = { db: NonNullable<Awaited<ReturnType<typeof createClient>>> } | { error: string };

async function guard(): Promise<Guard> {
  const db = await createClient();
  const me = await getProfile();
  if (!db || !me) return { error: "You are not signed in." };
  if (!canEdit(me, "settings")) {
    return { error: "Only an admin can change site settings." };
  }
  return { db };
}

/** Merge one key of the settings row without clobbering the others. */
async function patch(db: any, key: "org" | "contact" | "socials" | "feature_flags", value: unknown) {
  const { data } = await db.from("site_settings").select(key).eq("id", 1).single();
  const merged =
    Array.isArray(value) || key === "socials"
      ? value
      : { ...((data?.[key] as Record<string, unknown>) ?? {}), ...(value as object) };
  return db.from("site_settings").update({ [key]: merged }).eq("id", 1);
}

function str(form: FormData, k: string) {
  const v = form.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export async function saveOrgDetails(form: FormData): Promise<Result> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };

  const name = str(form, "name");
  if (!name) return { ok: false, error: "The organisation needs a name." };

  /* The legal name is checked, not trusted. Older collateral says "Africa
     Against Cancer"; the registered entity is "All Against Cancer Initiative",
     and the brief is explicit that the legacy name must never be reproduced.
     Typing it here would put it in the footer of every page. */
  if (/afric(a|an)\s+against\s+cancer/i.test(name)) {
    return {
      ok: false,
      error: 'That is the legacy name. The registered organisation is "All Against Cancer Initiative" — the old name must not appear on the site.',
    };
  }

  const { error } = await patch(g.db, "org", {
    name,
    abbr: str(form, "abbr"),
    tagline: str(form, "tagline"),
    registrationBody: str(form, "registrationBody"),
    registrationNumber: str(form, "registrationNumber"),
    country: str(form, "country"),
  });
  if (error) return { ok: false, error: error.message };

  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. It appears in the footer and in the structured data." };
}

export async function saveContact(form: FormData): Promise<Result> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };

  const general = str(form, "general");
  const support = str(form, "support");

  for (const [label, value] of [["General", general], ["Support", support]] as const) {
    if (value && !looksLikeEmail(value)) {
      return { ok: false, error: `The ${label.toLowerCase()} address does not look right.` };
    }
    /* This address is printed on every page and used as the reply-to on
       enquiry notifications. A typo here silently loses mail. */
    if (value && /gmail\.com$/i.test(value)) {
      return {
        ok: false,
        error: `${label} is set to a Gmail address. Use an @aaci.ngo address — a personal inbox on a registered charity's contact page undermines it, and the old Gmail account is legacy.`,
      };
    }
  }

  const { error } = await patch(g.db, "contact", { general, support });
  if (error) return { ok: false, error: error.message };

  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function saveSocials(form: FormData): Promise<Result> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };

  /* Names and urls arrive as parallel lists from the repeating rows. */
  const names = form.getAll("social_name").map((v) => String(v).trim());
  const urls = form.getAll("social_url").map((v) => String(v).trim());

  const socials: Record<string, string> = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const url = urls[i];
    if (!name || !url) continue;
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, error: `The ${name} link needs to start with https://` };
    }
    /* A share link is not a profile. Search engines read these as the
       organisation's official accounts, and a /share/ URL is a single post. */
    if (/\/share\//i.test(url)) {
      return {
        ok: false,
        error: `The ${name} link points at a single post, not the profile. Use the page's own address — a share link tells search engines the wrong thing about who you are.`,
      };
    }
    socials[name.toLowerCase()] = url;
  }

  const { error } = await patch(g.db, "socials", socials);
  if (error) return { ok: false, error: error.message };

  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. These are also what search engines read as your official accounts." };
}

export async function saveApplicationForms(form: FormData): Promise<Result> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };

  const countries = form.getAll("form_country").map((v) => String(v).trim());
  const urls = form.getAll("form_url").map((v) => String(v).trim());

  const forms: { country: string; url: string }[] = [];
  for (let i = 0; i < countries.length; i++) {
    if (!countries[i] || !urls[i]) continue;
    if (!/^https?:\/\//i.test(urls[i])) {
      return { ok: false, error: `The ${countries[i]} form link needs to start with https://` };
    }
    forms.push({ country: countries[i], url: urls[i] });
  }

  const { error } = await patch(g.db, "feature_flags", { application_forms: forms });
  if (error) return { ok: false, error: error.message };

  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `Saved ${forms.length} form${forms.length === 1 ? "" : "s"}. Past five countries the apply panel becomes a searchable dropdown on its own.`,
  };
}

export async function saveFlags(form: FormData): Promise<Result> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };

  const { error } = await patch(g.db, "feature_flags", {
    donations: form.get("donations") === "on",
    newsletter: form.get("newsletter") === "on",
    chatbot: form.get("chatbot") === "on",
  });
  if (error) return { ok: false, error: error.message };

  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
