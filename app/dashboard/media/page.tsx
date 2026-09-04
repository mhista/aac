import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { MediaLibrary } from "@/components/dashboard/MediaLibrary";

export const dynamic = "force-dynamic";

/**
 * The media library.
 *
 * Everything uploaded anywhere in the dashboard lands here. The screen exists
 * for three jobs: find a picture you already have, describe the ones nobody
 * described yet, and remove things that should not be published.
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; needs?: string }>;
}) {
  const { kind, needs } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "media")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Media" />
        <EmptyPanel
          title="Not available to your role"
          body={refusalFor("media")}
        />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  let q = db
    .from("media_assets")
    .select("id,kind,url,filename,mime_type,width,height,size_bytes,alt_text,caption,credit,tags,folder,consent_on_file,created_at")
    .order("created_at", { ascending: false })
    .limit(400);

  if (kind && kind !== "all") q = q.eq("kind", kind);
  if (needs === "alt") q = q.eq("alt_text", "");

  const { data } = await q;

  /* Counted across the whole library, not the filtered view — otherwise
     filtering to "needs describing" would report zero once you cleared the
     visible page. */
  const { count: undescribed } = await db
    .from("media_assets")
    .select("*", { count: "exact", head: true })
    .eq("alt_text", "");

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Media"
        description="Every photograph and video uploaded across the dashboard. Anything here can be reused anywhere else."
      />
      <MediaLibrary
        assets={(data ?? []) as any[]}
        undescribed={undescribed ?? 0}
        filter={{ kind: kind ?? "all", needs: needs ?? "" }}
        canDelete={canRemove(profile, "media")}
      />
    </div>
  );
}
