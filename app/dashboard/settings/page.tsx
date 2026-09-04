import { getProfile } from "@/lib/auth/session";
import { canRead, canEdit, refusalFor } from "@/lib/auth/capabilities";
import { getSiteSettings } from "@/lib/cms";
import { PageHeader, EmptyPanel } from "@/components/dashboard/ui";
import { SettingsManager } from "@/components/dashboard/SettingsManager";

export const dynamic = "force-dynamic";

/**
 * Site settings.
 *
 * Values shown here are already resolved — database over the coded defaults —
 * so what you see is exactly what the site is using, not what the database
 * happens to hold. A field that is empty in the database shows its default
 * rather than a blank, because that is the truth of what visitors see.
 */
export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) return null;

  if (!canRead(profile, "settings")) {
    return (
      <div className="mx-auto max-w-[900px]">
        <PageHeader title="Site settings" />
        <EmptyPanel title="Not available to your role" body={refusalFor("settings")} />
      </div>
    );
  }

  const s = await getSiteSettings();

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title="Site settings"
        description="Details that appear across the whole site. Anything left empty falls back to a built-in default, so a blank here never becomes a blank on the site."
      />
      <SettingsManager
        settings={{
          name: s.name,
          abbr: s.abbr,
          tagline: s.tagline,
          registration: s.registration,
          email: s.email,
          social: s.social.map((x) => ({ name: x.name, url: x.url })),
          applicationForms: s.applicationForms,
          flags: {
            donations: s.flags.donations,
            newsletter: s.flags.newsletter,
            chatbot: s.flags.chatbot,
          },
        }}
        canEdit={canEdit(profile, "settings")}
      />
    </div>
  );
}
