import { Hero } from "@/components/sections/Hero";
import { Statement } from "@/components/sections/Statement";
import { Pillars } from "@/components/sections/Pillars";
import { ImpactStats } from "@/components/sections/ImpactStats";
import { EventsPreview } from "@/components/sections/EventsPreview";
import { Reach } from "@/components/sections/Reach";
import { Values } from "@/components/sections/Values";
import { CtaBand } from "@/components/sections/CtaBand";
import { PostsPreview } from "@/components/sections/PostsPreview";
import { getEvents, getPosts, getImpactMetrics, getChapters, getPageSections } from "@/lib/cms";
import { ORG } from "@/lib/org";

export const revalidate = 3600;

export default async function HomePage() {
  /* Every one of these returns [] until the CMS has real rows.
     Sections handle their own empty state or return null. */
  const [events, posts, metrics, chapters, sections] = await Promise.all([
    getEvents({ limit: 4 }),
    getPosts({ limit: 3 }),
    getImpactMetrics(),
    getChapters(),
    getPageSections("home"),
  ]);

  const advocates = metrics.find((m) => m.key === "advocates")?.value_display ?? "800+";
  const campuses = ORG.structure.find((s) => s.label === "Campus Coordinators")?.value ?? "40+";

  /* `sections` is null when the registry is unreachable or empty, and then
     everything renders — a homepage must never lose content because a query
     failed. The hero is deliberately not switchable: a page that begins
     mid-sentence is not a design choice anyone would make. */
  const on = (type: string) =>
    !sections || (sections.find((s) => s.type === type)?.is_visible ?? true);

  /* Order comes from the registry too, so sections can be rearranged without
     a deploy. Anything the registry does not mention keeps its place here. */
  const order = (type: string) =>
    sections?.find((s) => s.type === type)?.position ?? 999;

  const blocks = [
    { type: "statement", node: <Statement advocates={advocates} campuses={campuses} /> },
    { type: "pillarCards", node: <Pillars /> },
    { type: "impactStats", node: <ImpactStats metrics={metrics} /> },
    { type: "featuredEvents", node: <EventsPreview events={events} /> },
    { type: "countryReach", node: <Reach chapters={chapters} /> },
    { type: "values", node: <Values /> },
    { type: "latestPosts", node: <PostsPreview posts={posts} /> },
    { type: "getInvolved", node: <CtaBand /> },
  ]
    .filter((b) => on(b.type))
    .sort((a, b) => order(a.type) - order(b.type));

  return (
    <>
      <Hero
        eyebrow={ORG.tagline}
        headline="Cancer is not only a medical problem."
        lede="It is a community problem, a research problem, an education problem and an access problem. That is why our response has to be bigger than medicine — and why it needs you."
      />

      {blocks.map((b) => (
        <div key={b.type}>{b.node}</div>
      ))}
    </>
  );
}
