import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { getPost, getPosts } from "@/lib/cms";
import { MEDICAL_NOTICE } from "@/lib/org";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { title: post.title, description: post.excerpt ?? undefined, type: "article" },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const related = (await getPosts({ limit: 4 })).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <div className="wrap pt-28 md:pt-36">
        <Link href="/blog" className="group inline-flex items-center gap-2 text-caption text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          <span aria-hidden="true" className="transition-transform duration-hover ease-entrance group-hover:-translate-x-1">←</span>
          All articles
        </Link>
      </div>

      <article>
        <header className="wrap pt-10 md:pt-14">
          <Reveal>
            <p className="mono">
              {[post.category?.name,
                post.published_at && new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
                post.read_minutes && `${post.read_minutes} min read`].filter(Boolean).join(" · ")}
            </p>
            <h1 className="display mt-6 max-w-[20ch] text-[clamp(2.25rem,1.6rem+3vw,4rem)]">{post.title}</h1>
            {post.excerpt && <p className="measure mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">{post.excerpt}</p>}
            {post.author && (
              <p className="mt-8 text-caption text-[var(--color-text-secondary)]">
                By <span className="text-[var(--color-text-primary)]">{post.author.full_name}</span>
                {post.author.role_title && ` · ${post.author.role_title}`}
              </p>
            )}
          </Reveal>
        </header>

        {post.cover?.url && (
          <div className="wrap mt-10 md:mt-14">
            <Reveal><Img src={post.cover.url} alt={post.cover.alt} ratio="16/9" sizes="(max-width:1280px) 100vw, 1280px" priority className="rounded-xl" /></Reveal>
          </div>
        )}

        <div className="wrap py-16 md:py-20">
          <div className="mx-auto max-w-[68ch] text-body leading-body">
            <p className="text-[var(--color-text-secondary)]">The full article will appear here once it is published from the CMS.</p>
          </div>
          <aside className="mx-auto mt-14 max-w-[68ch] rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] p-6">
            <p className="mono mb-2">Important</p>
            <p className="text-caption leading-body text-[var(--color-text-secondary)]">{MEDICAL_NOTICE}</p>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section border-t border-[var(--color-border-default)] pt-16">
          <div className="wrap">
            <p className="mono mb-8">More reading</p>
            <ul className="grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <Link href={`/blog/${p.slug}`} className="group block">
                    <h3 className="font-display text-[1.4rem] leading-heading text-[var(--color-text-display)]">{p.title}</h3>
                    <span className="mono mt-2 inline-block group-hover:text-[var(--color-text-emphasis)]">Read →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
