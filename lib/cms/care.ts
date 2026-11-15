"use server";

import { revalidatePath } from "next/cache";
import { canEdit, canRemove } from "@/lib/auth/capabilities";
import { getSession, NOT_SIGNED_IN, formReader, type ActionResult } from "@/lib/cms/shared";
import { KINDS, SERVICES } from "@/lib/care";

/**
 * The care directory: pharmacies, cancer centres and screening facilities.
 *
 * Every listing starts as a draft. Publishing is a separate tick in the form
 * and it asks for a phone number first, because a published listing with no
 * way to reach the place is worse than no listing: someone plans a journey
 * around it.
 *
 * Import adds drafts only. A spreadsheet from a partner is a starting point,
 * not something to put in front of patients unread.
 */

/* Not exported: a "use server" module may only export async functions. */
const PUBLIC_PATHS = [
  "/find-care",
  "/find-care/pharmacies",
  "/find-care/cancer-centres",
  "/find-care/screenings",
  "/departments/medication-access-partnerships",
  "/",
];

function refresh() {
  revalidatePath("/dashboard/directory");
  for (const p of PUBLIC_PATHS) revalidatePath(p);
  revalidatePath("/find-care/screenings/[test]", "page");
}

const KNOWN_KINDS = KINDS.map((k) => k.id) as string[];
const KNOWN_SERVICES = SERVICES.map((s) => s.slug);

function cleanUrl(v: string | null) {
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export async function createCarePlace(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canEdit(me, "directory")) return { ok: false, error: "Your role cannot add to the directory." };

  const { data, error } = await db
    .from("care_places")
    .insert({ name: "New listing", kind: "hospital", is_published: false, created_by: me.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/directory");
  return { ok: true, id: data.id as string, message: "Added as a draft. Fill in the details." };
}

export async function saveCarePlace(id: string, form: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canEdit(me, "directory")) return { ok: false, error: "Your role cannot edit the directory." };

  const { str } = formReader(form);
  const name = str("name");
  if (!name) return { ok: false, error: "A listing needs a name." };

  const kind = str("kind") ?? "hospital";
  if (!KNOWN_KINDS.includes(kind)) return { ok: false, error: "Unknown type of place." };

  const services = form
    .getAll("services")
    .map(String)
    .filter((s) => KNOWN_SERVICES.includes(s));
  /* A pharmacy sells medicines by definition; saying so again in a tick box
     is easy to forget, and the pharmacies page would then miss it. */
  if (kind === "pharmacy" && !services.includes("cancer-medicines")) services.push("cancer-medicines");

  const phone = str("phone");
  const whatsapp = str("whatsapp");
  const email = str("email");
  const published = form.get("is_published") === "on";

  if (published && !phone && !whatsapp && !email) {
    return {
      ok: false,
      error: "Add a phone number, WhatsApp or email before publishing. People need a way to reach the place.",
    };
  }
  if (published && !str("city") && !str("address")) {
    return { ok: false, error: "Add at least a city or an address before publishing." };
  }

  const { error } = await db
    .from("care_places")
    .update({
      name,
      kind,
      summary: str("summary"),
      services,
      medicines: str("medicines"),
      address: str("address"),
      city: str("city"),
      state: str("state"),
      country: str("country") ?? "Nigeria",
      phone,
      phone_alt: str("phone_alt"),
      whatsapp,
      email,
      website: cleanUrl(str("website")),
      hours: str("hours"),
      notes: str("notes"),
      is_partner: form.get("is_partner") === "on",
      is_published: published,
      verified_on: str("verified_on"),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, message: published ? "Saved. It is live on the website." : "Saved as a draft." };
}

export async function setCarePublished(id: string, published: boolean): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canEdit(me, "directory")) return { ok: false, error: "Your role cannot edit the directory." };

  if (published) {
    const { data } = await db
      .from("care_places")
      .select("phone,whatsapp,email,city,address")
      .eq("id", id)
      .maybeSingle();
    if (!data?.phone && !data?.whatsapp && !data?.email) {
      return { ok: false, error: "Add a phone number, WhatsApp or email before publishing." };
    }
    if (!data?.city && !data?.address) {
      return { ok: false, error: "Add at least a city or an address before publishing." };
    }
  }

  const { error } = await db.from("care_places").update({ is_published: published }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, message: published ? "Published." : "Taken off the website." };
}

export async function deleteCarePlace(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canRemove(me, "directory")) {
    return { ok: false, error: "Only a director or admin can delete a listing. Unpublish it instead." };
  }

  const { error } = await db.from("care_places").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "care_place_deleted",
    entity_type: "care_places",
    entity_id: id,
  });

  refresh();
  return { ok: true, message: "Listing deleted." };
}

/**
 * Paste-in import from a spreadsheet: one place per line, columns separated
 * by tabs (copied straight out of Excel or Google Sheets) or commas.
 *
 *   name, type, address, city, state, phone, email, services
 *
 * `type` takes "pharmacy", "cancer centre", "hospital" and so on. `services`
 * is a list separated by semicolons or slashes ("mammogram; pap smear").
 * A header row is recognised and skipped. Everything lands as a draft.
 */
export async function importCarePlaces(text: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!canEdit(me, "directory")) return { ok: false, error: "Your role cannot add to the directory." };

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, error: "Nothing to import." };
  if (lines.length > 500) return { ok: false, error: "Import at most 500 lines at a time." };

  const split = (l: string) =>
    (l.includes("\t") ? l.split("\t") : l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)).map((c) =>
      c.trim().replace(/^"|"$/g, "").trim()
    );

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const kindOf = (s: string) => {
    const n = norm(s);
    if (!n) return "hospital";
    const hit = KINDS.find((k) => norm(k.label) === n || norm(k.plural) === n || k.id.replace("_", " ") === n);
    if (hit) return hit.id;
    if (n.includes("pharm") || n.includes("chemist")) return "pharmacy";
    if (n.includes("cancer") || n.includes("oncolog")) return "cancer_centre";
    if (n.includes("diagnos") || n.includes("imaging") || n.includes("scan")) return "diagnostic_centre";
    if (n.includes("lab")) return "laboratory";
    if (n.includes("clinic")) return "clinic";
    if (n.includes("hospital")) return "hospital";
    return "other";
  };
  const servicesOf = (s: string) =>
    s
      .split(/[;/|]/)
      .map(norm)
      .filter(Boolean)
      .map((n) => SERVICES.find((x) => norm(x.name) === n || x.slug.replace(/-/g, " ") === n || norm(x.name).startsWith(n))?.slug)
      .filter((x): x is string => !!x);

  let rows = lines.map(split);
  if (rows[0] && /^name$/i.test(rows[0][0] ?? "")) rows = rows.slice(1);

  const records = rows
    .filter((c) => (c[0] ?? "").length > 1)
    .map((c) => {
      const kind = kindOf(c[1] ?? "");
      const services = servicesOf(c[7] ?? "");
      if (kind === "pharmacy" && !services.includes("cancer-medicines")) services.push("cancer-medicines");
      return {
        name: c[0].slice(0, 200),
        kind,
        address: c[2] || null,
        city: c[3] || null,
        state: c[4] || null,
        phone: c[5] || null,
        email: c[6] || null,
        services,
        is_published: false,
        created_by: me.id,
      };
    });

  if (records.length === 0) return { ok: false, error: "No rows with a name were found." };

  const { error } = await db.from("care_places").insert(records);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/directory");
  return {
    ok: true,
    message: `Imported ${records.length} as drafts. Check each one, then publish.`,
  };
}
