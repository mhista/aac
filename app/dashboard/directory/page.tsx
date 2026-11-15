import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, canRemove, refusalFor } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyPanel, Notice } from "@/components/dashboard/ui";
import { DirectoryManager } from "@/components/dashboard/DirectoryManager";
import { CARE_COLUMNS, type CarePlace } from "@/lib/care";

export const dynamic = "force-dynamic";

/**
 * Care directory: the pharmacies, cancer centres and screening facilities the
 * public can look up at /find-care. Kept by the Medication Access & Global
 * Partnership department.
 */
export default async function DirectoryPage() {
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "directory")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Care directory" />
        <EmptyPanel title="Not available to your role" body={refusalFor("directory")} />
      </div>
    );
  }

  const db = await createClient();
  if (!db) return null;

  const { data, error } = await db
    .from("care_places")
    .select(CARE_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(2000);

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Care directory"
        description="Pharmacies, cancer centres and facilities offering screenings, shown to the public at /find-care. Everything starts as a draft; publish a listing once someone has called to confirm the details."
      />
      {error ? (
        <Notice tone="warning" title="The directory table is not set up yet">
          Run <code>supabase/migrations/017_care_directory.sql</code> in the Supabase SQL editor, then reload this page.
        </Notice>
      ) : (
        <DirectoryManager
          places={(data ?? []) as CarePlace[]}
          canEdit={canEdit(profile, "directory")}
          canRemove={canRemove(profile, "directory")}
        />
      )}
    </div>
  );
}
