"use server";

import { revalidatePath } from "next/cache";
import { atLeast } from "@/lib/auth/permissions";
import { getSession, NOT_SIGNED_IN, formReader, type ActionResult } from "@/lib/cms/shared";

/**
 * Zones.
 *
 * The tier between a campus and a region. Nigeria's six geopolitical zones are
 * seeded because they are the ones AAC uses, but nothing in the code knows
 * those names — this is what makes that true in practice rather than only in
 * principle. Adding "Ashanti" for Ghana is a form, not a deploy.
 *
 * Deleting refuses while anyone or any chapter still points at a zone. A zonal
 * coordinator whose zone disappeared would have a role scoped to nothing,
 * which reads as a permissions bug months later rather than as a tidy-up.
 */

type Result = ActionResult;

export async function createZone(form: FormData): Promise<Result> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!atLeast(me, "regional_coordinator")) {
    return { ok: false, error: "Only a regional coordinator or above can add a zone." };
  }

  const { str } = formReader(form);

  const name = str("name");
  const country = str("country");
  if (!name) return { ok: false, error: "A zone needs a name." };
  if (!country) return { ok: false, error: "A zone needs a country." };

  const { data: last } = await db
    .from("zones")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("zones")
    .insert({
      name,
      country,
      covers: str("covers"),
      region_id: str("region_id"),
      position: (last?.position ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `There is already a zone called ${name} in ${country}.` };
    }
    if (error.code === "42P01") {
      return { ok: false, error: "The zones table does not exist yet — run migrations 010 then 011." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/chapters");
  return { ok: true, id: data.id as string, message: `Added ${name}.` };
}

export async function saveZone(id: string, form: FormData): Promise<Result> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!atLeast(me, "regional_coordinator")) return { ok: false, error: "Your role does not allow this." };

  const { str } = formReader(form);

  const name = str("name");
  const country = str("country");
  if (!name) return { ok: false, error: "A zone needs a name." };
  if (!country) return { ok: false, error: "A zone needs a country." };

  const { error } = await db
    .from("zones")
    .update({
      name,
      country,
      covers: str("covers"),
      region_id: str("region_id"),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `There is already a zone called ${name} in ${country}.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/chapters");
  revalidatePath("/dashboard/users");
  return { ok: true, message: "Saved." };
}

export async function deleteZone(id: string): Promise<Result> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const { db, me } = session;
  if (!atLeast(me, "admin")) return { ok: false, error: "Only an admin can delete a zone." };

  const [{ count: people }, { count: chapters }] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }).eq("zone_id", id),
    db.from("chapters").select("*", { count: "exact", head: true }).eq("zone_id", id),
  ]);

  if ((people ?? 0) > 0 || (chapters ?? 0) > 0) {
    const bits: string[] = [];
    if (people) bits.push(`${people} ${people === 1 ? "person" : "people"}`);
    if (chapters) bits.push(`${chapters} chapter${chapters === 1 ? "" : "s"}`);
    return {
      ok: false,
      error: `${bits.join(" and ")} still belong to this zone. Move them first — a coordinator whose zone vanished has a role scoped to nothing.`,
    };
  }

  const { error } = await db.from("zones").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/chapters");
  return { ok: true, message: "Zone deleted." };
}
