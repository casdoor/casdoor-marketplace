import type { MetadataRoute } from "next";
import { getIntegrations } from "@/lib/integrations";
import { siteUrl } from "@/lib/site";

// Served as /integrations/sitemap.xml so it is reachable at www.casdoor.com through the same rewrite as the pages.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const integrations = await getIntegrations();
  return [
    { url: `${siteUrl}/integrations`, changeFrequency: "weekly", priority: 0.8 },
    ...integrations.map((i) => ({
      url: `${siteUrl}/integrations/${i.id}`,
      lastModified: i.versions.find((v) => v.version === i.latest)?.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
