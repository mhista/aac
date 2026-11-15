import Link from "next/link";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight } from "@/components/ui/Icon";
import { CareDoors } from "@/components/care/CareSections";
import { ORG } from "@/lib/org";

/**
 * Homepage: the way in to the Medication Access & Global Partnership
 * department and the directory it keeps.
 *
 * Most visitors arriving with a diagnosis, or for someone who has one, are not
 * looking for the organisation; they are looking for a pharmacy, a centre or a
 * test. This puts that within one click of the front door.
 */
export function CareAccess() {
  const dept = ORG.departments.find((d) => d.slug === "medication-access-partnerships");
  const href = `/departments/${dept?.slug ?? "medication-access-partnerships"}`;

  return (
    <section className="section bg-[var(--color-surface-page-alt)]" aria-labelledby="care-access-title">
      <div className="wrap">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <Reveal>
            <p className="mono">Need help with care?</p>
            <h2 id="care-access-title" className="display mt-4 text-[clamp(1.9rem,1.35rem+2.4vw,3.25rem)]">
              <Link href={href} className="group decoration-[0.06em] underline-offset-[0.18em] hover:underline">
                Visit the Medication Access &amp; Global Partnership Department
                <ArrowRight className="ml-3 inline-block h-[0.7em] w-[0.7em] align-baseline transition-transform duration-hover ease-entrance group-hover:translate-x-2" />
              </Link>
            </h2>
            <p className="measure mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">
              Find a pharmacy that stocks cancer medicines, a cancer centre and the services it offers, or a facility
              for a screening such as a mammogram. Every listing has an address and a number to call.
            </p>
          </Reveal>
          {dept?.image && (
            <Reveal delay={0.08}>
              <Img src={dept.image} ratio="4/3" sizes="(max-width:1024px) 100vw, 42vw" className="rounded-xl" />
            </Reveal>
          )}
        </div>
        <Reveal delay={0.12}>
          <div className="mt-12">
            <CareDoors />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
