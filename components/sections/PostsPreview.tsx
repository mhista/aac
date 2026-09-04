import Link from "next/link";
import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";
import { Empty } from "@/components/ui/Empty";
import type { PostRecord } from "@/lib/cms";
import { ArrowRight } from "@/components/ui/Icon";

export function PostCard({ p }: { p: PostRecord }) {
  return (
    <Link href={`/blog/${p.slug}`} className="group block h-full overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] transition-shadow duration-hover ease-entrance hover:shadow-lift">
      {p.cover && (
        <Img src={p.cover.url} alt={p.cover.alt} ratio="3/2" sizes="(max-width:768px) 100vw, 33vw"
             imgClassName="transition-transform duration-[600ms] ease-entrance group-hover:scale-[1.03]" />
      )}
      <div className="p-6">
        <p className="mono">
          {[p.published_at && new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            p.read_minutes && `${p.read_minutes} min read`].filter(Boolean).join(" · ")}
        </p>
        <h3 className="mt-3 font-display text-[1.5rem] leading-heading text-[var(--color-text-display)]">{p.title}</h3>
        {p.excerpt && <p className="mt-2.5 text-caption leading-body text-[var(--color-text-secondary)]">{p.excerpt}</p>}
      </div>
    </Link>
  );
}

export function PostsPreview({ posts }: { posts: PostRecord[] }) {
  return (
    <section className="section">
      <div className="wrap">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mono mb-4">Insights</p>
              <h2 className="display max-w-[14ch] text-[clamp(2.125rem,1.43rem+2.86vw,4rem)]">From the blog</h2>
            </div>
            {posts.length > 0 && (
              <Link href="/blog" className="group inline-flex items-center gap-2 text-body text-[var(--color-text-emphasis)]">
                All articles
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </Reveal>

        <div className="mt-14">
          {posts.length === 0 ? (
            <Reveal>
              <Empty
                title="Writing in progress"
                body="Evidence-based articles on prevention, early detection, survivorship and African cancer research are being prepared and reviewed. We publish nothing about health that has not been checked."
                cta={{ label: "Get updates by email", href: "/contact" }}
                compact
              />
            </Reveal>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {posts.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.08}><PostCard p={p} /></Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
