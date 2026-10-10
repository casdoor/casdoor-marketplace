import type { MetadataRoute } from "next";
import { getIntegrations } from "@/lib/integrations";
import { collections, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const integrations = await getIntegrations();
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    ...collections.map((c) => ({ url: `${siteUrl}/${c.slug}/`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...integrations.map((i) => ({
      url: `${siteUrl}/integrations/${i.id}/`,
      lastModified: i.versions.find((v) => v.version === i.latest)?.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
