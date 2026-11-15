import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight } from "@/components/ui/Icon";
import { CareHeader } from "@/components/care/CareHeader";
import { CareDoors, CareNote } from "@/components/care/CareSections";
import { getCarePlaces } from "@/lib/cms";
import { SCREENINGS, isPharmacy, isCancerCentre, offers } from "@/lib/care";
import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Find cancer care",
  description:
    "Pharmacies that stock cancer medicines, cancer centres, and facilities offering screenings such as mammograms, Pap smears and PSA tests, with addresses and phone numbers.",
  path: "/find-care",
});

export default async function FindCarePage() {
  const places = await getCarePlaces();
  const counts = {
    pharmacies: places.filter(isPharmacy).length,
    centres: places.filter(isCancerCentre).length,
  };
  const tests = SCREENINGS.map((s) => ({ ...s, n: places.filter((p) => offers(p, s.slug)).length }));

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Find care", path: "/find-care" }])} />
      <CareHeader
        title="Find cancer care near you"
        lede="A directory kept by our Medication Access & Global Partnership department: where to buy cancer medicines, where to be treated, and where to get screened. Every listing has an address and a number to call."
      />

      <section className="section pt-12 md:pt-16">
        <div className="wrap">
          <Reveal>
            <CareDoors />
          </Reveal>
          {places.length > 0 && (
            <p className="mono mt-6">
              {counts.pharmacies} {counts.pharmacies === 1 ? "pharmacy" : "pharmacies"} · {counts.centres}{" "}
              {counts.centres === 1 ? "cancer centre" : "cancer centres"} listed
            </p>
          )}
        </div>
      </section>

      <section className="section bg-[var(--color-surface-page-alt)]">
        <div className="wrap">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">Screenings & tests</h2>
              <Link
                href="/find-care/screenings"
                className="group inline-flex items-center gap-2 text-caption text-[var(--color-text-primary)]"
              >
                All tests
                <ArrowRight className="h-4 w-4 transition-transform duration-hover group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
          <ul className="mt-8 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
            {tests.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/find-care/screenings/${t.slug}`}
                  className="group flex items-baseline justify-between gap-6 py-4"
                >
                  <span>
                    <span className="text-body-l text-[var(--color-text-display)]">{t.name}</span>
                    <span className="ml-3 text-caption text-[var(--color-text-secondary)]">{t.about}</span>
                  </span>
                  <span className="mono shrink-0">
                    {t.n > 0 ? `${t.n} ${t.n === 1 ? "place" : "places"}` : "None listed yet"}
                    <ArrowRight className="ml-2 inline h-4 w-4 transition-transform duration-hover group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <CareNote />
          </div>
        </div>
      </section>
    </>
  );
}
