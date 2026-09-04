import { Hero } from "@/components/sections/Hero";
import { Statement } from "@/components/sections/Statement";
import { Pillars } from "@/components/sections/Pillars";
import { ImpactStats } from "@/components/sections/ImpactStats";
import { EventsPreview } from "@/components/sections/EventsPreview";
import { Reach } from "@/components/sections/Reach";
import { Values } from "@/components/sections/Values";
import { CtaBand } from "@/components/sections/CtaBand";
import { PostsPreview } from "@/components/sections/PostsPreview";
import { getEvents, getPosts, getImpactMetrics, getChapters } from "@/lib/cms";
import { ORG } from "@/lib/org";

export const revalidate = 3600;

export default async function HomePage() {
  /* Every one of these returns [] until the CMS has real rows.
     Sections handle their own empty state or return null. */
  const [events, posts, metrics, chapters] = await Promise.all([
    getEvents({ limit: 4 }),
    getPosts({ limit: 3 }),
    getImpactMetrics(),
    getChapters(),
  ]);

  const advocates = metrics.find((m) => m.key === "advocates")?.value_display ?? "800+";
  const campuses = ORG.structure.find((s) => s.label === "Campus Coordinators")?.value ?? "40+";

  return (
    <>
      <Hero
        eyebrow={ORG.tagline}
        headline="Cancer is not only a medical problem."
        lede="It is a community problem, a research problem, an education problem and an access problem. That is why our response has to be bigger than medicine — and why it needs you."
      />

      <Statement advocates={advocates} campuses={campuses} />
      <Pillars />
      <ImpactStats metrics={metrics} />
      <EventsPreview events={events} />
      <Reach chapters={chapters} />
      <Values />
      <PostsPreview posts={posts} />
      <CtaBand />
    </>
  );
}
