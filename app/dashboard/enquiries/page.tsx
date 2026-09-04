import { getProfile } from "@/lib/auth/session";
import { canRead, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { EnquiriesManager } from "@/components/dashboard/EnquiriesManager";

export const dynamic = "force-dynamic";

/**
 * Enquiries.
 *
 * Messages from the contact form. Patient support enquiries are separated out
 * rather than mixed into one stream: somebody writing because a relative has
 * just been diagnosed should not sit behind four press requests, and a shared
 * inbox sorted only by date guarantees that they will.
 */
export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; status?: string }>;
}) {
  const { topic, status } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "enquiries")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Enquiries" />
        <EmptyPanel
          title="Not available to your role"
          body="Enquiries contain people's names, email addresses and sometimes their medical situation, so they are limited to coordinators and above."
        />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  let q = db
    .from("form_submissions")
    .select("id,form_type,payload,status,created_at")
    .like("form_type", "contact:%")
    .order("created_at", { ascending: false })
    .limit(400);

  if (status && status !== "all") q = q.eq("status", status);
  if (topic && topic !== "all") q = q.eq("form_type", `contact:${topic}`);

  const { data } = await q;

  /* Counted across everything, not the filtered view — a badge that empties
     when you filter is worse than no badge. */
  const { count: unread } = await db
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .like("form_type", "contact:%")
    .eq("status", "new");

  const { count: unreadSupport } = await db
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("form_type", "contact:support")
    .eq("status", "new");

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Enquiries"
        description="Messages sent through the contact form. Replies go from your own email — this is the shared record of what came in and what has been answered."
      />
      <EnquiriesManager
        enquiries={(data ?? []) as any[]}
        unread={unread ?? 0}
        unreadSupport={unreadSupport ?? 0}
        filter={{ topic: topic ?? "all", status: status ?? "all" }}
        canDelete={canRemove(profile, "enquiries")}
      />
    </div>
  );
}
