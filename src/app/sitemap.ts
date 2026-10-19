import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { WORK } from "@/lib/works";
import portrait from "@/assets/jana-portrait-bw.jpg";
import studio from "@/assets/studio-easels.jpg";

export default function sitemap(): MetadataRoute.Sitemap {
  const images = [portrait, studio, ...WORK.filter((w) => w.real).map((w) => w.img)].map((img) => `${SITE_URL}${img.src}`);

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      images,
    },
  ];
}
