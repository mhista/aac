import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight } from "@/components/ui/Icon";
import { CareHeader } from "@/components/care/CareHeader";
import { CareDoors, CareNote } from "@/components/care/CareSections";
import { getCarePlaces } from "@/lib/cms";
import { SCREENINGS, offers } from "@/lib/care";
import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Cancer screenings and tests",
  description:
    "Choose a cancer screening or test, such as a mammogram, Pap smear, HPV test or PSA test, and see the health facilities that offer it, with addresses and phone numbers.",
  path: "/find-care/screenings",
});

export default async function ScreeningsPage() {
  const places = await getCarePlaces();
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Find care", path: "/find-care" },
          { name: "Screenings & tests", path: "/find-care/screenings" },
        ])}
      />
      <CareHeader
        back={{ href: "/find-care", label: "Find care" }}
        eyebrow="Medication Access & Global Partnership"
        title="Screenings & tests"
        lede="Choose a test to see the health facilities that offer it, with their address and a number to call."
      />
      <section className="section pt-10 md:pt-14">
        <div className="wrap">
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SCREENINGS.map((s, i) => {
              const n = places.filter((p) => offers(p, s.slug)).length;
              return (
                <li key={s.slug}>
                  <Reveal delay={Math.min(i, 5) * 0.04}>
                    <Link
                      href={`/find-care/screenings/${s.slug}`}
                      className="group flex h-full flex-col rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-6 transition-colors duration-hover hover:border-[var(--color-text-display)] md:p-7"
                    >
                      <span className="mono">{s.about}</span>
                      <span className="mt-3 font-display text-[1.5rem] leading-heading text-[var(--color-text-display)]">
                        {s.name}
                      </span>
                      <span className="mt-2 text-caption leading-body text-[var(--color-text-secondary)]">{s.blurb}</span>
                      <span className="mt-auto flex items-center justify-between pt-6 text-caption">
                        <span className="text-[var(--color-text-primary)]">
                          {n > 0 ? `${n} ${n === 1 ? "facility" : "facilities"}` : "None listed yet"}
                        </span>
                        <ArrowRight className="h-5 w-5 text-[var(--color-text-display)] transition-transform duration-hover group-hover:translate-x-1.5" />
                      </span>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
          <div className="mt-12">
            <CareNote />
          </div>
        </div>
      </section>
      <section className="section border-t border-[var(--color-border-default)]">
        <div className="wrap">
          <CareDoors exclude="/find-care/screenings" numbered={false} />
        </div>
      </section>
    </>
  );
}
