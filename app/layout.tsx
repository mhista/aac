import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/ui/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollTop } from "@/components/ui/ScrollTop";
import { ORG } from "@/lib/org";
import { JsonLd, organizationLd, websiteLd, SITE } from "@/lib/seo";



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

export const viewport: Viewport = {
  themeColor: "#1E0B45",
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&family=Instrument+Sans:wght@400..600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <JsonLd data={[organizationLd(), websiteLd()]} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SmoothScroll />
        <Nav />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <ScrollTop />
      </body>
    </html>
  );
}
