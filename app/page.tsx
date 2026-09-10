import { Hero } from "@/components/sections/Hero";
import { Statement } from "@/components/sections/Statement";
import { Pillars } from "@/components/sections/Pillars";
import { ImpactStats } from "@/components/sections/ImpactStats";
import { EventsPreview } from "@/components/sections/EventsPreview";
import { Reach } from "@/components/sections/Reach";
import { Values } from "@/components/sections/Values";
import { CtaBand } from "@/components/sections/CtaBand";
import { PostsPreview } from "@/components/sections/PostsPreview";
import { Leadership } from "@/components/sections/Leadership";
import { getEvents, getPosts, getImpactMetrics, getChapters, getPageSections, getTeam } from "@/lib/cms";
import { getCampus } from "@/lib/site/campus";
import { ORG } from "@/lib/org";

export default async function HomePage() {
  /* Every one of these returns [] until the CMS has real rows.
     Sections handle their own empty state or return null.

     They are also already scoped to whichever site this is: on a campus
     subdomain `events` are that chapter's events and `team` is that chapter's
     executives, without a single call here changing. */
  const [campus, events, posts, metrics, chapters, sections, team] = await Promise.all([
    getCampus(),
    getEvents({ limit: 4 }),
    getPosts({ limit: 3 }),
    getImpactMetrics(),
    getChapters(),
    getPageSections("home"),
    getTeam(),
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

  /* The national figures and the Africa map are claims about the whole
     organisation. On a chapter's own front page they would read as that
     chapter's numbers, which would be an overstatement of exactly the kind
     this project has refused from the start. So they stay on the main site. */
  const NATIONAL_ONLY = new Set(["impactStats", "countryReach"]);

  const blocks = [
    { type: "statement", node: <Statement advocates={advocates} campuses={campuses} /> },
    { type: "pillarCards", node: <Pillars /> },
    { type: "impactStats", node: <ImpactStats metrics={metrics} /> },
    {
      type: "leadership",
      node: campus ? (
        <Leadership
          team={team}
          eyebrow="Chapter executives"
          heading={`Who runs ${campus.name}`}
          href="/contact"
        />
      ) : (
        <Leadership team={team} />
      ),
    },
    { type: "featuredEvents", node: <EventsPreview events={events} /> },
    { type: "countryReach", node: <Reach chapters={chapters} /> },
    { type: "values", node: <Values /> },
    { type: "latestPosts", node: <PostsPreview posts={posts} /> },
    { type: "getInvolved", node: <CtaBand /> },
  ]
    .filter((b) => on(b.type))
    .filter((b) => !(campus && NATIONAL_ONLY.has(b.type)))
    .sort((a, b) => order(a.type) - order(b.type));

  return (
    <>
      <Hero
        eyebrow={campus ? `${ORG.abbr} · ${campus.university}` : ORG.tagline}
        headline={campus?.headline ?? "Cancer is not only a medical problem."}
        lede={
          campus?.lede ??
          (campus
            ? `The ${campus.name} chapter of ${ORG.name}${campus.city ? `, ${campus.city}` : ""}.`
            : "It is a community problem, a research problem, an education problem and an access problem. That is why our response has to be bigger than medicine — and why it needs you.")
        }
      />

      {blocks.map((b) => (
        <div key={b.type}>{b.node}</div>
      ))}
    </>
  );
}
