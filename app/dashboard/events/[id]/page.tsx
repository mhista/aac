import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canPublish } from "@/lib/auth/permissions";
import { canFeature } from "@/lib/auth/reach";
import { EventEditor } from "@/components/dashboard/EventEditor";
import { FeatureToggle } from "@/components/dashboard/FeatureToggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit event", robots: { index: false, follow: false } };

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const db = await createClient();
  if (!profile || !db) notFound();

  const [{ data: event }, { data: photos }] = await Promise.all([
    db.from("events")
      .select("id,title,slug,subtitle,event_type,body,status,starts_at,ends_at,venue,city,country,attendance,screenings_done,materials_distributed,chapter_id,is_featured")
      .eq("id", id)
      .single(),
    db.from("event_media")
      .select("id,url,alt,caption,position")
      .eq("event_id", id)
      .order("position"),
  ]);

  if (!event) notFound();

  /* Only a chapter's event can be borrowed by the main site — AAC's own
     events are already there. */
  const chapterId = (event as any).chapter_id as string | null;
  let chapterName = "";
  if (chapterId && canFeature(profile)) {
    const { data: ch } = await db
      .from("chapters")
      .select("name,university")
      .eq("id", chapterId)
      .maybeSingle();
    chapterName = (ch as any)?.name || (ch as any)?.university || "a chapter";
  }

  return (
    <>
      <EventEditor
        event={event as any}
        photos={(photos ?? []) as any}
        profile={profile}
        canPublishNow={canPublish(profile)}
      />

      {chapterId && canFeature(profile) && (
        <div className="mx-auto mt-5 max-w-[820px]">
          <FeatureToggle
            kind="events"
            id={id}
            on={(event as any).is_featured === true}
            published={(event as any).status === "published"}
            chapterName={chapterName}
          />
        </div>
      )}
    </>
  );
}
