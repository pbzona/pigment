import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pigment.phil.bingo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/studio`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/learn`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/palettes`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
