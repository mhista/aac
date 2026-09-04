import type { MetadataRoute } from "next";
import { getEvents, getPosts, getProgrammes } from "@/lib/cms";
import { ORG } from "@/lib/org";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaci.ngo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, posts, programmes] = await Promise.all([getEvents(), getPosts(), getProgrammes()]);

  const staticRoutes = [
    "", "/about", "/what-we-do", "/departments", "/programmes", "/events", "/blog",
    "/impact", "/research", "/innovation", "/support", "/donate", "/contact",
    "/get-involved", "/get-involved/advocates", "/get-involved/fellowship",
    "/get-involved/chapters", "/get-involved/volunteer", "/get-involved/partner",
  ].map((p) => ({ url: `${SITE}${p}`, lastModified: new Date(), priority: p === "" ? 1 : 0.7 }));

  return [
    ...staticRoutes,
    ...ORG.departments.map((d) => ({ url: `${SITE}/departments/${d.slug}`, lastModified: new Date(), priority: 0.6 })),
    ...events.map((e) => ({ url: `${SITE}/events/${e.slug}`, lastModified: new Date(), priority: 0.6 })),
    ...posts.map((p) => ({ url: `${SITE}/blog/${p.slug}`, lastModified: new Date(), priority: 0.6 })),
    ...programmes.map((p) => ({ url: `${SITE}/programmes/${p.slug}`, lastModified: new Date(), priority: 0.6 })),
  ];
}
