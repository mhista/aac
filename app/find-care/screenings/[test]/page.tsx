import Link from "next/link";
import { notFound } from "next/navigation";
import { CareHeader } from "@/components/care/CareHeader";
import { CareNote } from "@/components/care/CareSections";
import { PlaceFinder } from "@/components/care/PlaceFinder";
import { getCarePlaces } from "@/lib/cms";
import { SCREENINGS, offers } from "@/lib/care";
import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";

export const revalidate = 3600;

export function generateStaticParams() {
  return SCREENINGS.map((s) => ({ test: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ test: string }> }) {
  const { test } = await params;
  const s = SCREENINGS.find((x) => x.slug === test);
  if (!s) return { title: "Test not found", robots: { index: false, follow: false } };
  return pageMetadata({
    title: `${s.name.split(" (")[0]}: where to get it`,
    description: `Health facilities that offer ${s.name} (${s.about.toLowerCase()}), with their address, phone number and directions.`,
    path: `/find-care/screenings/${s.slug}`,
  });
}

export default async function ScreeningPage({ params }: { params: Promise<{ test: string }> }) {
  const { test } = await params;
  const s = SCREENINGS.find((x) => x.slug === test);
  if (!s) notFound();

  const places = (await getCarePlaces()).filter((p) => offers(p, s.slug));
  const others = SCREENINGS.filter((x) => x.slug !== s.slug);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Find care", path: "/find-care" },
          { name: "Screenings & tests", path: "/find-care/screenings" },
          { name: s.name, path: `/find-care/screenings/${s.slug}` },
        ])}
      />
      <CareHeader
        back={{ href: "/find-care/screenings", label: "All screenings & tests" }}
        eyebrow={s.about}
        title={s.name}
        lede={`${s.blurb} These are the facilities we know offer it. Call to book and to ask about the cost.`}
      />
      <section className="section pt-10 md:pt-14">
        <div className="wrap">
          <PlaceFinder
            places={places}
            highlight={s.slug}
            noun="facilities"
            emptyTitle={`No facilities listed for ${s.name} yet`}
            emptyBody="We only list places once we have confirmed the test is available and the phone number works. If you know a facility that offers it, tell us and we will check."
          />
          <div className="mt-12">
            <CareNote />
          </div>
        </div>
      </section>
      <section className="section border-t border-[var(--color-border-default)]">
        <div className="wrap">
          <p className="mono">Other tests</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/find-care/screenings/${o.slug}`}
                  className="inline-flex min-h-[40px] items-center rounded-pill border border-[var(--color-border-default)] px-4 text-caption text-[var(--color-text-primary)] transition-colors duration-hover hover:border-[var(--color-text-display)]"
                >
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
