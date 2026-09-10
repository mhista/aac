import { readdir } from "node:fs/promises";
import path from "node:path";
import { getProfile } from "@/lib/auth/session";
import { rank } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { reachableChapters } from "@/lib/auth/reach";
import { PageHeader, EmptyPanel, Notice, inputCls } from "@/components/dashboard/ui";
import { TeamManager } from "@/components/dashboard/TeamManager";
import { ChapterPicker } from "@/components/dashboard/ChapterPicker";

export const dynamic = "force-dynamic";

/**
 * Chapter executives.
 *
 * The same screen as Team & directors, pointed at one chapter's committee.
 * A campus coordinator lands on their own chapter with no choice to make —
 * they have exactly one — while anyone whose remit covers several picks from
 * a list of the chapters they actually reach.
 *
 * Kept separate from Team & directors on purpose. They look alike but they are
 * different jobs with different consequences: one is the organisation's public
 * face, the other is a student committee that changes every academic year.
 */
export default async function ExecutivesPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { chapter: wanted } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  /* Campus coordinator and upwards. A contributor writes; they do not decide
     who runs the chapter. */
  if (rank(profile) < 50) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Chapter executives" />
        <EmptyPanel
          title="Not available to your role"
          body="Listing a chapter's executives is the campus coordinator's job, and their coordinators above them."
        />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const chapters = await reachableChapters(profile);

  if (chapters.length === 0) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Chapter executives" />
        <EmptyPanel
          title="No chapter attached to you yet"
          body="An admin attaches you to a chapter in Users & roles. Until then there is no committee for you to list."
        />
      </div>
    );
  }

  /* Their own chapter wins over a query string they did not choose. */
  const selected =
    chapters.find((c) => c.id === wanted)?.id ??
    chapters.find((c) => c.id === profile.chapter_id)?.id ??
    chapters[0].id;

  const selectedName = chapters.find((c) => c.id === selected)?.name ?? "this chapter";

  const [{ data }, { data: site }] = await Promise.all([
    db.from("team_members").select("*").eq("chapter_id", selected).order("position"),
    db.from("chapters").select("subdomain,site_enabled").eq("id", selected).maybeSingle(),
  ]);

  let photos: string[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "team");
    photos = (await readdir(dir))
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f) => `/team/${f}`);
  } catch {
    /* No folder yet. The picker offers uploads only. */
  }

  const members = (data ?? []) as any[];
  const missingPhotos = members.filter((m) => !m.photo?.url).length;
  const live = (site as any)?.site_enabled === true && (site as any)?.subdomain;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Chapter executives"
        description={`The committee running ${selectedName}. Publishing someone puts them on the chapter's own website.`}
        action={
          chapters.length > 1 ? (
            <ChapterPicker chapters={chapters} selected={selected} className={inputCls} />
          ) : null
        }
      />

      {!live && (
        <div className="mb-5">
          <Notice tone="info" title="This chapter has no website yet">
            You can list the committee now — it will appear the moment an admin switches the
            chapter&rsquo;s site on in Chapters.
          </Notice>
        </div>
      )}

      <TeamManager
        members={members}
        photos={photos}
        missingPhotos={missingPhotos}
        canEdit
        canDelete
        chapterId={selected}
        addLabel="Add an executive"
        emptyBody="The president, secretary, treasurer and the rest of the committee. Once published they appear on the chapter's own website."
      />
    </div>
  );
}
