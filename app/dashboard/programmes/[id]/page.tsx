import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canPublish } from "@/lib/auth/permissions";
import { canRead, refusalFor } from "@/lib/auth/capabilities";
import { canFeature } from "@/lib/auth/reach";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { ProgrammeEditor } from "@/components/dashboard/ProgrammeEditor";
import { FeatureToggle } from "@/components/dashboard/FeatureToggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit programme", robots: { index: false, follow: false } };

export default async function EditProgramme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "programmes")) {
    return (
      <div className="mx-auto max-w-[880px]">
        <PageHeader title="Programme" />
        <EmptyPanel title="Not available to your role" body={refusalFor("programmes")} />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const { data: programme } = await db.from("programmes").select("*").eq("id", id).single();
  if (!programme) notFound();

  const chapterId = (programme as any).chapter_id as string | null;
  let chapterName = "";
  if (chapterId && canFeature(profile)) {
    const { data: ch } = await db
      .from("chapters").select("name,university").eq("id", chapterId).maybeSingle();
    chapterName = (ch as any)?.name || (ch as any)?.university || "a chapter";
  }

  return (
    <>
      <ProgrammeEditor programme={programme as any} canPublishNow={canPublish(profile)} />

      {chapterId && canFeature(profile) && (
        <div className="mx-auto mt-5 max-w-[880px]">
          <FeatureToggle
            kind="programmes"
            id={id}
            on={(programme as any).is_featured === true}
            published={(programme as any).status === "published"}
            chapterName={chapterName}
          />
        </div>
      )}
    </>
  );
}
