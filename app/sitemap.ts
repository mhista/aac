import type { MetadataRoute } from "next";
import { getEvents, getPosts, getProgrammes } from "@/lib/cms";
import { getCampus, originFor } from "@/lib/site/campus";
import { ORG } from "@/lib/org";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaci.ngo";

/**
 * One sitemap per site.
 *
 * The content queries are already scoped to whichever campus the request came
 * in on, so this file needs no filtering of its own — it only has to write the
 * right hostname in front of each path. A campus sitemap that listed aaci.ngo
 * URLs would be pointing search engines at pages that do not contain the
 * chapter's content.
 *
 * Chapter-specific pages are the ones a chapter can actually fill. The national
 * pages — departments, research, donate — stay on the main sitemap, because a
 * chapter site serving an identical copy of /donate at a different hostname is
 * duplicate content, not a feature.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campus = await getCampus();
  const site = originFor(campus?.subdomain ?? null, BASE);

  const [events, posts, programmes] = await Promise.all([getEvents(), getPosts(), getProgrammes()]);

  const paths = campus
    ? ["", "/events", "/blog", "/programmes", "/contact"]
    : [
        "", "/about", "/what-we-do", "/departments", "/programmes", "/events", "/blog",
        "/impact", "/research", "/innovation", "/support", "/donate", "/contact",
        "/get-involved", "/get-involved/advocates", "/get-involved/fellowship",
        "/get-involved/chapters", "/get-involved/volunteer", "/get-involved/partner",
      ];

  const staticRoutes = paths.map((p) => ({
    url: `${site}${p}`,
    lastModified: new Date(),
    priority: p === "" ? 1 : 0.7,
  }));

  const departments = campus
    ? []
    : ORG.departments.map((d) => ({
        url: `${site}/departments/${d.slug}`,
        lastModified: new Date(),
        priority: 0.6,
      }));

  return [
    ...staticRoutes,
    ...departments,
    ...events.map((e) => ({ url: `${site}/events/${e.slug}`, lastModified: new Date(), priority: 0.6 })),
    ...posts.map((p) => ({ url: `${site}/blog/${p.slug}`, lastModified: new Date(), priority: 0.6 })),
    ...programmes.map((p) => ({ url: `${site}/programmes/${p.slug}`, lastModified: new Date(), priority: 0.6 })),
  ];
}
