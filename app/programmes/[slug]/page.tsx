import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { getProgramme } from "@/lib/cms";
import { ArrowLeft, ArrowRight } from "@/components/ui/Icon";
import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProgramme(slug);
  if (!p) return { title: "Programme not found", robots: { index: false, follow: false } };
  return pageMetadata({
    title: p.title,
    description: p.excerpt ?? `${p.title} — an All Against Cancer programme.`,
    path: `/programmes/${p.slug}`,
    image: p.cover?.url ?? null,
  });
}

export default async function ProgrammeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProgramme(slug);
  if (!p) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Programmes", path: "/programmes" },
          { name: p.title, path: `/programmes/${p.slug}` },
        ])}
      />
      <div className="wrap pt-28 md:pt-36">
        <Link href="/programmes" className="group inline-flex items-center gap-2 text-caption text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:-translate-x-1" />
          All programmes
        </Link>
      </div>

      <header className="wrap pt-10 md:pt-14">
        <Reveal>
          {p.status_label && <p className="mono">{p.status_label}</p>}
          <h1 className="display mt-5 max-w-[18ch] text-[clamp(2.5rem,1.7rem+3.4vw,4.5rem)]">{p.title}</h1>
          {p.subtitle && <p className="measure mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">{p.subtitle}</p>}
        </Reveal>
      </header>

      {p.cover?.url && (
        <div className="wrap mt-12">
          <Reveal><Img src={p.cover.url} alt={p.cover.alt} ratio="16/9" sizes="(max-width:1280px) 100vw, 1280px" priority className="rounded-xl" /></Reveal>
        </div>
      )}

      <section className="section">
        <div className="wrap grid gap-14 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <Reveal>
            <dl className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)] lg:sticky lg:top-28">
              {p.pillar && (
                <div className="flex justify-between gap-6 py-3.5"><dt className="mono">Pillar</dt><dd className="text-caption">{p.pillar}</dd></div>
              )}
              {p.locations && p.locations.length > 0 && (
                <div className="flex justify-between gap-6 py-3.5"><dt className="mono">Where</dt><dd className="text-caption">{p.locations.join(", ")}</dd></div>
              )}
            </dl>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="measure text-body leading-body">
              {p.excerpt ? <p>{p.excerpt}</p> : <p className="text-[var(--color-text-secondary)]">Full details of this programme will appear here.</p>}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
