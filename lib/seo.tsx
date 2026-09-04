import type { Metadata } from "next";
import { ORG } from "@/lib/org";

/**
 * SEO helpers.
 *
 * Two jobs: build consistent, canonical-correct metadata for every route, and
 * emit structured data so search engines can identify AAC as a real registered
 * NGO rather than guessing.
 *
 * The canonical URL matters more than usual here. Vercel serves the same site
 * on a `.vercel.app` preview domain and on the real domain; without an explicit
 * canonical, those compete for the same rankings and split them.
 */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaci.ngo").replace(/\/$/, "");

export const absolute = (path = "/") => `${SITE}${path.startsWith("/") ? path : `/${path}`}`;

const DEFAULT_OG = absolute("/og-default.jpg");

/** Trim a description to a length search engines will actually display. */
function clamp(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", max - 1))}…`;
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  noIndex?: boolean;
}): Metadata {
  const url = absolute(path);
  const desc = clamp(description);
  const img = image ?? DEFAULT_OG;

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: ORG.name,
      title: `${title} · ${ORG.abbr}`,
      description: desc,
      locale: "en_NG",
      images: [{ url: img, width: 1200, height: 630, alt: `${ORG.name} — ${ORG.tagline}` }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${ORG.abbr}`,
      description: desc,
      images: [img],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

/* ── Structured data ────────────────────────────────────────────────── */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    "@id": `${SITE}/#organization`,
    name: ORG.name,
    alternateName: [ORG.abbr, ORG.shortName],
    url: SITE,
    logo: { "@type": "ImageObject", url: absolute("/aac-icon-512.png"), width: 512, height: 512 },
    image: DEFAULT_OG,
    slogan: ORG.tagline,
    description: ORG.mission,
    email: ORG.email.general,
    foundingLocation: { "@type": "Country", name: "Nigeria" },
    areaServed: ORG.countries.map((name) => ({ "@type": "Country", name })),
    address: { "@type": "PostalAddress", addressCountry: "NG" },
    knowsAbout: [
      "Cancer prevention", "Cancer awareness", "Cancer screening", "Early detection",
      "HPV vaccination", "Hepatitis B vaccination", "Patient support", "Cancer survivorship",
      "Cancer research in Africa", "Access to cancer medicines", "Digital health",
    ],
    identifier: {
      "@type": "PropertyValue",
      name: `${ORG.registration.body} Registration Number`,
      value: ORG.registration.number,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "general enquiries",
        email: ORG.email.general,
        areaServed: ORG.countries,
        availableLanguage: "English",
      },
      {
        "@type": "ContactPoint",
        contactType: "patient and survivor support",
        email: ORG.email.support,
        areaServed: ORG.countries,
        availableLanguage: "English",
      },
    ],
    sameAs: ORG.social.map((s) => s.url),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    url: SITE,
    name: ORG.name,
    description: ORG.mission,
    publisher: { "@id": `${SITE}/#organization` },
    inLanguage: "en",
  };
}

/** Breadcrumbs. Pass the trail without the home crumb — it is added here. */
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absolute(c.path),
    })),
  };
}

export function articleLd({
  title, description, path, image, publishedAt, authorName, reviewedBy,
}: {
  title: string; description?: string | null; path: string; image?: string | null;
  publishedAt?: string | null; authorName?: string | null; reviewedBy?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    /* MedicalWebPage when a clinician has reviewed it — this is what lets search
       engines treat health content as reviewed rather than as opinion. */
    "@type": reviewedBy ? ["Article", "MedicalWebPage"] : "Article",
    headline: title,
    description: description ?? undefined,
    image: image ?? DEFAULT_OG,
    datePublished: publishedAt ?? undefined,
    dateModified: publishedAt ?? undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(path) },
    author: authorName
      ? { "@type": "Person", name: authorName }
      : { "@id": `${SITE}/#organization` },
    publisher: { "@id": `${SITE}/#organization` },
    ...(reviewedBy ? { reviewedBy: { "@type": "Person", name: reviewedBy } } : {}),
  };
}

export function eventLd({
  title, description, path, image, startsAt, endsAt, venue, city, country,
}: {
  title: string; description?: string | null; path: string; image?: string | null;
  startsAt?: string | null; endsAt?: string | null;
  venue?: string | null; city?: string | null; country?: string | null;
}) {
  const past = startsAt ? new Date(startsAt) < new Date() : false;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    description: description ?? undefined,
    image: image ?? DEFAULT_OG,
    startDate: startsAt ?? undefined,
    endDate: endsAt ?? startsAt ?? undefined,
    eventStatus: `https://schema.org/Event${past ? "Scheduled" : "Scheduled"}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: { "@id": `${SITE}/#organization` },
    url: absolute(path),
    isAccessibleForFree: true,
    ...(venue || city
      ? {
          location: {
            "@type": "Place",
            name: venue ?? city ?? undefined,
            address: {
              "@type": "PostalAddress",
              addressLocality: city ?? undefined,
              addressCountry: country ?? undefined,
            },
          },
        }
      : {}),
  };
}

export function faqLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

/** Renders one or more JSON-LD blocks. */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}
