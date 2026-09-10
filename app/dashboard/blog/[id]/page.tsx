import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { canPublish } from "@/lib/auth/permissions";
import { canRead, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { EmptyPanel, PageHeader } from "@/components/dashboard/ui";
import { PostEditor } from "@/components/dashboard/PostEditor";
import { FeatureToggle } from "@/components/dashboard/FeatureToggle";
import { canFeature } from "@/lib/auth/reach";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "blog")) {
    return (
      <div className="mx-auto max-w-[900px]">
        <PageHeader title="Article" />
        <EmptyPanel
          title="Not available to your role"
          body={refusalFor("blog")}
        />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const [{ data: post }, { data: categories }] = await Promise.all([
    db.from("posts").select("*").eq("id", id).single(),
    db.from("categories").select("slug,name").eq("kind", "post").order("position"),
  ]);

  if (!post) notFound();

  const chapterId = (post as any).chapter_id as string | null;
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
      <PostEditor
        post={post as any}
        categories={(categories ?? []) as any[]}
        profile={profile}
        canPublishNow={canPublish(profile)}
      />

      {chapterId && canFeature(profile) && (
        <div className="mx-auto mt-5 max-w-[900px]">
          <FeatureToggle
            kind="posts"
            id={id}
            on={(post as any).is_featured === true}
            published={(post as any).status === "published"}
            chapterName={chapterName}
          />
        </div>
      )}
    </>
  );
}
