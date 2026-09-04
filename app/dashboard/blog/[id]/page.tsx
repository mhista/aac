import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { canPublish } from "@/lib/auth/permissions";
import { canRead, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { EmptyPanel, PageHeader } from "@/components/dashboard/ui";
import { PostEditor } from "@/components/dashboard/PostEditor";

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

  return (
    <PostEditor
      post={post as any}
      categories={(categories ?? []) as any[]}
      profile={profile}
      canPublishNow={canPublish(profile)}
    />
  );
}
