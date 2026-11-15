import { CareHeader } from "@/components/care/CareHeader";
import { CareDoors, CareNote } from "@/components/care/CareSections";
import { PlaceFinder } from "@/components/care/PlaceFinder";
import { getCarePlaces } from "@/lib/cms";
import { isCancerCentre } from "@/lib/care";
import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Cancer centres",
  description:
    "Hospitals and cancer centres that offer cancer treatment, with the services each provides, their address and phone number.",
  path: "/find-care/cancer-centres",
});

export default async function CancerCentresPage() {
  const places = (await getCarePlaces()).filter(isCancerCentre);
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Find care", path: "/find-care" },
          { name: "Cancer centres", path: "/find-care/cancer-centres" },
        ])}
      />
      <CareHeader
        back={{ href: "/find-care", label: "Find care" }}
        eyebrow="Medication Access & Global Partnership"
        title="Cancer centres"
        lede="Where to go for diagnosis and treatment. Each listing shows the services the centre offers, from chemotherapy and radiotherapy to palliative care."
      />
      <section className="section pt-10 md:pt-14">
        <div className="wrap">
          <PlaceFinder
            places={places}
            noun="centres"
            emptyTitle="Our list of cancer centres is being put together"
            emptyBody="We are confirming each centre's services and phone numbers before we publish them, so nobody makes a journey for the wrong reason. Know a centre we should list? Tell us."
          />
          <div className="mt-12">
            <CareNote />
          </div>
        </div>
      </section>
      <section className="section border-t border-[var(--color-border-default)]">
        <div className="wrap">
          <CareDoors exclude="/find-care/cancer-centres" numbered={false} />
        </div>
      </section>
    </>
  );
}
