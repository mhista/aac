import Link from "next/link";
import { notFound } from "next/navigation";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { Empty } from "@/components/ui/Empty";
import { ArrowLeft, ArrowRight } from "@/components/ui/Icon";
import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { getTeam } from "@/lib/cms";
import { ORG } from "@/lib/org";

export const revalidate = 3600;

const CATEGORY: Record<string, { label: string; surface: string; text: string }> = {
  awareness:  { label: "Awareness",  surface: "var(--color-category-awareness-surface)",  text: "var(--color-category-awareness-text)" },
  support:    { label: "Support",    surface: "var(--color-category-support-surface)",    text: "var(--color-category-support-text)" },
  research:   { label: "Research",   surface: "var(--color-category-research-surface)",   text: "var(--color-category-research-text)" },
  innovation: { label: "Innovation", surface: "var(--color-category-innovation-surface)", text: "var(--color-category-innovation-text)" },
};

export function generateStaticParams() {
  return ORG.departments.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = ORG.departments.find((x) => x.slug === slug);
  if (!d) return { title: "Department not found", robots: { index: false, follow: false } };
  return pageMetadata({
    title: `${d.name} Department`,
    description: d.summary,
    path: `/departments/${d.slug}`,
  });
}

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dept = ORG.departments.find((d) => d.slug === slug);
  if (!dept) notFound();

  const cat = CATEGORY[dept.category];
  const idx = ORG.departments.findIndex((d) => d.slug === slug);
  const next = ORG.departments[(idx + 1) % ORG.departments.length];

  /* The director comes from the CMS. Until a real person is published with a
     real photograph, this renders an honest empty state rather than a
     placeholder face — the same rule as the rest of the site. */
  const directors = await getTeam("director");
  const director = directors.find(
    (d) => d.role_title?.toLowerCase().includes(dept.short.toLowerCase().split(" ")[0])
  );

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Departments", path: "/departments" },
          { name: dept.name, path: `/departments/${dept.slug}` },
        ])}
      />

      <div className="wrap pt-28 md:pt-36">
        <Link href="/departments" className="group inline-flex items-center gap-2 text-caption text-[var(--color-text-secondary)] transition-colors duration-hover hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:-translate-x-1" />
          All departments
        </Link>
      </div>

      <header className="wrap pt-10 md:pt-14">
        <Reveal>
          <div className="flex items-center gap-3">
            <span className="mono">{dept.number}</span>
            <span className="mono inline-block rounded-pill px-2.5 py-1" style={{ background: cat.surface, color: cat.text }}>
              {cat.label}
            </span>
          </div>
          <h1 className="display mt-6 max-w-[16ch] text-[clamp(2.25rem,1.6rem+3vw,4rem)]">{dept.name}</h1>
          <p className="measure mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">{dept.summary}</p>
        </Reveal>
      </header>

      {/* Director */}
      <section className="section pt-14 md:pt-16">
        <div className="wrap">
          {director ? (
            <Reveal>
              <div className="grid items-center gap-10 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-7 md:grid-cols-[280px_1fr] md:p-10">
                {director.photo?.url && (
                  <Img src={director.photo.url} alt={director.photo.alt} ratio="1/1" sizes="280px" className="rounded-lg" />
                )}
                <div>
                  <p className="mono mb-3">Director</p>
                  <h2 className="font-display text-[1.75rem] leading-heading text-[var(--color-text-display)]">
                    {director.full_name}
                  </h2>
                  {director.role_title && <p className="mono mt-1">{director.role_title}</p>}
                  {director.bio && (
                    <p className="measure mt-5 text-body leading-body text-[var(--color-text-secondary)]">
                      {director.bio}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <Empty
                title="A word from the director is coming"
                body={`The director of ${dept.name} will introduce this department here — who they are, what they are building, and what they need from the people who join. We publish real people with real photographs, so this space stays empty until then.`}
                compact
              />
            </Reveal>
          )}
        </div>
      </section>

      {/* What this department does */}
      <section className="section bg-[var(--color-surface-page-alt)] pt-0">
        <div className="wrap grid gap-12 pt-16 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)]">What this department does</h2>
            <ul className="mt-8 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
              {dept.activities.map((a) => (
                <li key={a} className="py-4 text-body leading-body text-[var(--color-text-primary)]">{a}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <Img src={dept.image} ratio="4/3" sizes="(max-width:1024px) 100vw, 45vw" className="rounded-xl" />
          </Reveal>
        </div>
      </section>

      {/* Next */}
      <section className="border-t border-[var(--color-border-default)]">
        <Link href={`/departments/${next.slug}`} className="group block">
          <div className="wrap flex flex-wrap items-baseline justify-between gap-4 py-14 md:py-20">
            <p className="mono">Next department</p>
            <p className="font-display text-[clamp(1.5rem,1.15rem+1.7vw,2.5rem)] text-[var(--color-text-display)]">
              {next.name}
              <ArrowRight className="ml-4 inline-block h-[0.8em] w-[0.8em] align-baseline transition-transform duration-hover ease-entrance group-hover:translate-x-2" />
            </p>
          </div>
        </Link>
      </section>
    </>
  );
}
