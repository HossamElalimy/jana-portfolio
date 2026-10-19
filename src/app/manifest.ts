import type { MetadataRoute } from "next";

import { BRAND } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Jana — Artist & Graphic Designer",
    short_name: "Jana",
    description: "Original paintings and graphic design by Jana Ezzeldin. لوحات أصلية وتصميم جرافيك لجنى عز الدين.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND.paper,
    theme_color: BRAND.paper,
    lang: "en",
    dir: "auto",
    categories: ["art", "design", "portfolio"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
