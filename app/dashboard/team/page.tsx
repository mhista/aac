import { readdir } from "node:fs/promises";
import path from "node:path";
import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { TeamManager } from "@/components/dashboard/TeamManager";

export const dynamic = "force-dynamic";

/**
 * Team & directors.
 *
 * The photograph picker offers whatever is sitting in /public/team. That is
 * how the three portraits nobody could match to a name get assigned: the
 * pictures are already uploaded and named `unassigned-N`, and whoever knows
 * these people picks the right face in a dropdown. Guessing on their behalf
 * would put the wrong person on the About page.
 *
 * Direct upload arrives with the media library; until then, files are dropped
 * into /public/team and appear here on the next load.
 */
export default async function TeamPage() {
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "team")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Team & directors" />
        <EmptyPanel
          title="Not available to your role"
          body={refusalFor("team")}
        />
      </div>
    );
  }

  const db = await createClient();
  const { data } = db
    ? await db.from("team_members").select("*").order("position")
    : { data: [] };

  /* Scan the folder rather than keeping a list in code — a file dropped in is
     immediately pickable, with no deploy. */
  let photos: string[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "team");
    photos = (await readdir(dir))
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f) => `/team/${f}`);
  } catch {
    /* No folder yet. The picker simply offers nothing. */
  }

  const members = (data ?? []) as any[];

  /* Count PEOPLE without a photograph, not files nobody picked.
     The earlier version counted leftover files in /public/team, which stays
     non-zero forever once someone uploads a new portrait instead of choosing
     one of the pre-uploaded ones — the file is still unused, but the person
     it was meant for now has a picture. A file sitting unused is housekeeping;
     a person with no face on the About page is the thing worth flagging. */
  const missingPhotos = members.filter((m) => !m.photo?.url).length;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Team & directors"
        description="The board, department directors and coordinators shown on the About page and on each department page. Publishing a person puts them on the live site."
      />
      <TeamManager
        members={members}
        photos={photos}
        missingPhotos={missingPhotos}
        canEdit={canEdit(profile, "team")}
        canDelete={canRemove(profile, "team")}
      />
    </div>
  );
}
