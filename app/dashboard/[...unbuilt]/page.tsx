import Link from "next/link";
import { PageHeader, EmptyPanel, BTN } from "@/components/dashboard/ui";

/**
 * Catch-all for dashboard sections that have not been built yet.
 *
 * Real routes always win over a catch-all, so this only ever renders for a
 * sidebar link with no page behind it. Without it those links fell through to
 * the root 404 — which renders inside the *public site* layout, so clicking
 * "Blog" in the dashboard appeared to throw you back onto the website.
 *
 * Delete this file once every section exists.
 */

const SECTIONS: Record<string, string> = {
  programmes: "The six pillars and their programme pages.",
  people: "Advocates, their chapter, and where they are in onboarding.",
  "impact-reports": "Reports submitted by coordinators, awaiting verification.",
};

export default async function Unbuilt({ params }: { params: Promise<{ unbuilt: string[] }> }) {
  const { unbuilt } = await params;
  const section = unbuilt?.[0] ?? "";
  const label = section.replace(/-/g, " ");
  const description = SECTIONS[section];

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title={label ? label[0].toUpperCase() + label.slice(1) : "Not found"} />
      <EmptyPanel
        title="This section is not built yet"
        body={
          description
            ? `${description} It is on the list — the dashboard is being built one section at a time, starting with the ones people need first.`
            : "There is nothing at this address. Check the link, or pick a section from the sidebar."
        }
        action={
          <Link href="/dashboard" className={BTN.secondary}>
            Back to the dashboard
          </Link>
        }
      />
    </div>
  );
}
