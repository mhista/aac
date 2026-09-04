import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/ui/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ORG } from "@/lib/org";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaci.ngo";

export const metadata: Metadata = {
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
  },
  twitter: {
    card: "summary_large_image",
    title: `${ORG.name} — ${ORG.tagline}`,
    description: ORG.visionShort,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/aac-icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/aac-icon-192.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1E0B45",
  width: "device-width",
  initialScale: 1,
};

/** Organisation structured data — helps search engines identify a real NGO. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: ORG.name,
  alternateName: ORG.abbr,
  url: SITE,
  logo: `${SITE}/aac-icon-512.png`,
  slogan: ORG.tagline,
  description: ORG.mission,
  email: ORG.email.general,
  areaServed: ORG.countries,
  address: { "@type": "PostalAddress", addressCountry: "NG" },
  identifier: {
    "@type": "PropertyValue",
    name: "Corporate Affairs Commission Registration Number",
    value: ORG.registration.number,
  },
  sameAs: ORG.social.map((s) => s.url),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SmoothScroll />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
