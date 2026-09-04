import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { getPost, getPosts } from "@/lib/cms";
import { MEDICAL_NOTICE } from "@/lib/org";
import { pageMetadata, JsonLd, articleLd, breadcrumbLd } from "@/lib/seo";
import { ArrowLeft, ArrowRight } from "@/components/ui/Icon";
import { Markdown } from "@/lib/markdown";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };
  return pageMetadata({
    title: post.title,
    description: post.excerpt ?? `${post.title} — from the All Against Cancer blog.`,
    path: `/blog/${post.slug}`,
    image: post.cover?.url ?? null,
    type: "article",
    publishedTime: post.published_at,
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const related = (await getPosts({ limit: 4 })).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          articleLd({
            title: post.title,
            description: post.excerpt,
            path: `/blog/${post.slug}`,
            image: post.cover?.url ?? null,
            publishedAt: post.published_at,
            authorName: post.author?.full_name ?? null,
          }),
          breadcrumbLd([
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <div className="wrap pt-28 md:pt-36">
        <Link href="/blog" className="group inline-flex items-center gap-2 text-caption text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:-translate-x-1" />
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
            {post.body ? (
              <Markdown>{post.body}</Markdown>
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                This article has no body yet.
              </p>
            )}
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
                    <span className="mono mt-2 inline-flex items-center gap-1.5 group-hover:text-[var(--color-text-emphasis)]">Read <ArrowRight className="h-3.5 w-3.5 transition-transform duration-hover ease-entrance group-hover:translate-x-1" /></span>
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
