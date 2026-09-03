import type { MetadataRoute } from "next";
import { sitemapService } from "@/lib/services/sitemap.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/beats`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  const [beats, producers] = await Promise.all([
    sitemapService.getPublishedBeats(500),
    sitemapService.getProducers(200),
  ]);

  const beatPages: MetadataRoute.Sitemap = beats.map((beat) => ({
    url: `${baseUrl}/beats/${beat._id}`,
    lastModified: beat.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const producerPages: MetadataRoute.Sitemap = producers.map((p) => ({
    url: `${baseUrl}/producer/${p.username}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...beatPages, ...producerPages];
}
