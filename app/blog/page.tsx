import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { PostCard } from "@/components/sections/PostsPreview";
import { Empty } from "@/components/ui/Empty";
import { Reveal } from "@/components/motion/Reveal";
import { getPosts } from "@/lib/cms";

export const metadata = pageMetadata({
  title: 'Blog',
  description: 'Evidence-based writing on cancer prevention, early detection, survivorship, research and innovation in Africa.',
  path: '/blog',
});

export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="From the blog."
        lede="Writing on prevention, early detection, survivorship and African cancer research. Everything here is checked before it is published — we would rather say nothing than say something wrong about health."
        aside={posts.length > 0 ? <p className="mono">{posts.length} {posts.length === 1 ? "article" : "articles"}</p> : null}
      />
      <section className="section">
        <div className="wrap">
          {posts.length === 0 ? (
            <Reveal>
              <Empty
                title="Writing in progress"
                body="Articles on prevention, screening, survivorship and African cancer research are being drafted and reviewed. Health writing goes through review before it appears here, so this page fills slowly and deliberately."
                cta={{ label: "Get updates by email", href: "/contact" }}
              />
            </Reveal>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 0.08}><PostCard p={p} /></Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
