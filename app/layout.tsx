import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/ui/Footer";
import { ChromeGate } from "@/components/ui/ChromeGate";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollTop } from "@/components/ui/ScrollTop";
import { ORG } from "@/lib/org";
import { JsonLd, organizationLd, websiteLd, SITE } from "@/lib/seo";
import { getPublicSettings } from "@/lib/cms/public-settings";
import { CampusBar } from "@/components/ui/CampusBar";
import { getCampus, originFor } from "@/lib/site/campus";



const BASE: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${ORG.name} — ${ORG.tagline}`,
    template: `%s · ${ORG.abbr}`,
  },
  description: ORG.mission,
  applicationName: ORG.name,
  keywords: [
    "cancer", "Africa", "cancer awareness", "cancer advocacy", "Nigeria",
    "Ghana", "Kenya", "cancer prevention", "cancer research", "patient support", "NGO",
  ],
  openGraph: {
    type: "website",
    siteName: ORG.name,
    title: `${ORG.name} — ${ORG.tagline}`,
    description: ORG.visionShort,
    url: SITE,
    locale: "en_NG",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: `${ORG.name} — ${ORG.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${ORG.name} — ${ORG.tagline}`,
    description: ORG.visionShort,
    images: ["/og-default.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/aac-icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/aac-icon-192.png",
  },
  alternates: { canonical: SITE },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  category: "Health",
  authors: [{ name: ORG.name, url: SITE }],
  creator: ORG.name,
  publisher: ORG.name,
  formatDetection: { telephone: false },
};

/**
 * A campus subdomain is a site in its own right, so it gets its own title,
 * its own canonical URL and its own social card.
 *
 * The canonical is the part that actually matters. Forty chapter sites all
 * declaring aaci.ngo as canonical would tell Google they are duplicates of the
 * national site and should not be indexed — which is the opposite of why the
 * chapters wanted sites.
 */
export async function generateMetadata(): Promise<Metadata> {
  const campus = await getCampus();
  if (!campus) return BASE;

  const origin = originFor(campus.subdomain, SITE);
  const title = `${campus.name} — ${ORG.abbr}`;
  const description =
    campus.lede ??
    `The ${campus.name} chapter of ${ORG.name}${campus.city ? `, ${campus.city}` : ""}. ${ORG.tagline}.`;

  return {
    ...BASE,
    metadataBase: new URL(origin),
    title: { default: title, template: `%s · ${campus.name}` },
    description,
    alternates: { canonical: origin },
    openGraph: { ...BASE.openGraph, title, description, url: origin, siteName: campus.name },
    twitter: { ...BASE.twitter, title, description },
  };
}

export const viewport: Viewport = {
  themeColor: "#1E0B45",
  width: "device-width",
  initialScale: 1,
};


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&family=Instrument+Sans:wght@400..600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <JsonLd data={[organizationLd(settings), websiteLd()]} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SmoothScroll />
        {/* Public chrome only. The dashboard is a tool, not a marketing page. */}
        <ChromeGate>
          <CampusBar />
          <Nav />
        </ChromeGate>
        <main id="main" tabIndex={-1}>{children}</main>
        <ChromeGate>
          <Footer />
          <ScrollTop />
        </ChromeGate>
      </body>
    </html>
  );
}
