import type { MetadataRoute } from "next";
import { ORG } from "@/lib/org";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ORG.name,
    short_name: ORG.shortName,
    description: ORG.mission,
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F4",
    theme_color: "#1E0B45",
    icons: [
      { src: "/aac-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/aac-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
