import { CareHeader } from "@/components/care/CareHeader";
import { CareDoors, CareNote } from "@/components/care/CareSections";
import { PlaceFinder } from "@/components/care/PlaceFinder";
import { getCarePlaces } from "@/lib/cms";
import { isPharmacy } from "@/lib/care";
import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Pharmacies for cancer medicines",
  description:
    "Pharmacies that stock cancer medicines, with their address, phone number and directions, so you can find the one closest to you and call ahead.",
  path: "/find-care/pharmacies",
});

export default async function PharmaciesPage() {
  const places = (await getCarePlaces()).filter(isPharmacy);
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Find care", path: "/find-care" },
          { name: "Pharmacies", path: "/find-care/pharmacies" },
        ])}
      />
      <CareHeader
        back={{ href: "/find-care", label: "Find care" }}
        eyebrow="Medication Access & Global Partnership"
        title="Pharmacies for cancer medicines"
        lede="Find the pharmacy closest to you, then call to check they have what you need before you go."
      />
      <section className="section pt-10 md:pt-14">
        <div className="wrap">
          <PlaceFinder
            places={places}
            noun="pharmacies"
            emptyTitle="Our pharmacy list is being put together"
            emptyBody="We are confirming the pharmacies we work with, one phone call at a time, before we publish them. Know a pharmacy that stocks cancer medicines? Tell us and we will check it."
          />
          <div className="mt-12">
            <CareNote />
          </div>
        </div>
      </section>
      <section className="section border-t border-[var(--color-border-default)]">
        <div className="wrap">
          <CareDoors exclude="/find-care/pharmacies" numbered={false} />
        </div>
      </section>
    </>
  );
}
