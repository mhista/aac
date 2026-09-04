import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, refusalFor } from "@/lib/auth/capabilities";
import { getApplicationSettings } from "@/lib/cms";
import { listWaitlist } from "@/lib/waitlist/admin";
import { isEmailConfigured } from "@/lib/email/send";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { ApplicationsManager } from "@/components/dashboard/ApplicationsManager";

export const dynamic = "force-dynamic";

/**
 * Applications.
 *
 * One screen answers the two questions that matter: are applications open,
 * and who is waiting? The switch and the list belong together — closing an
 * intake is what creates the list, and opening one is what empties it.
 */
export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string; status?: string }>;
}) {
  const { interest, status } = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "applications")) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader title="Applications" />
        <EmptyPanel
          title="Not available to your role"
          body="This list holds people's names and email addresses, so it is limited to coordinators and above. If you need access, ask an admin to change your role."
        />
      </div>
    );
  }

  const [settings, rows] = await Promise.all([
    getApplicationSettings(),
    listWaitlist({ interest, status }),
  ]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Applications"
        description="Open or close applications for the whole site, and manage the people waiting to hear when the next intake starts."
      />
      <ApplicationsManager
        rows={rows}
        open={settings.open}
        closedNote={settings.closedNote}
        formCount={settings.forms.length}
        emailReady={isEmailConfigured()}
        canAdmin={canEdit(profile, "applications")}
        filter={{ interest: interest ?? "all", status: status ?? "all" }}
      />
    </div>
  );
}
