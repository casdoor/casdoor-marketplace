import type { CatalogItem } from "@/components/catalog-browser";
import { IntegrationCard } from "@/components/integration-card";
import { featuredIds, typeLabels } from "@/lib/site";
import type { Integration } from "@/lib/types";

export function toCatalogItems(integrations: Integration[]): CatalogItem[] {
  return integrations.map((i) => {
    const featured = featuredIds.indexOf(i.id);
    return {
      id: i.id,
      type: i.type,
      name: i.name.en,
      text: [i.name.en, i.description.en, typeLabels[i.type], ...i.categories, ...(i.tags ?? [])].join(" ").toLowerCase(),
      categories: i.categories,
      tags: i.tags ?? [],
      rank: featured === -1 ? featuredIds.length : featured,
      updated: i.versions.find((v) => v.version === i.latest)?.publishedAt ?? "",
      card: <IntegrationCard integration={i} />,
    };
  });
}
