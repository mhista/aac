import type { MetadataRoute } from "next";
import { getCampus, originFor } from "@/lib/site/campus";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaci.ngo";

/**
 * Each campus site points crawlers at its own sitemap. Sending every subdomain
 * to aaci.ngo/sitemap.xml would mean no chapter's pages were ever announced.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const campus = await getCampus();
  const site = originFor(campus?.subdomain ?? null, BASE);

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
