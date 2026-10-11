import type { CatalogItem } from "@/components/catalog-browser";
import { IntegrationCard } from "@/components/integration-card";
import { getMessages, translateCategory, translateTag, type Locale } from "@/lib/i18n";
import { featuredIds } from "@/lib/site";
import type { Integration } from "@/lib/types";

export function toCatalogItems(integrations: Integration[], lang: Locale): CatalogItem[] {
  const m = getMessages(lang);
  return integrations.map((i) => {
    const featured = featuredIds.indexOf(i.id);
    const categories = i.categories.map((c) => translateCategory(c, lang));
    const tags = (i.tags ?? []).map((t) => translateTag(t, lang));
    // the English words stay searchable on translated pages
    const words = [i.name.en, i.description.en, m.typeLabels[i.type], ...categories, ...tags];
    if (lang !== "en") {
      words.push(...i.categories, ...(i.tags ?? []));
    }
    return {
      id: i.id,
      type: i.type,
      name: i.name.en,
      text: words.join(" ").toLowerCase(),
      categories,
      tags,
      rank: featured === -1 ? featuredIds.length : featured,
      updated: i.versions.find((v) => v.version === i.latest)?.publishedAt ?? "",
      card: <IntegrationCard integration={i} lang={lang} />,
    };
  });
}
