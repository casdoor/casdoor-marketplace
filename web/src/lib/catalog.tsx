import type { CatalogItem } from "@/components/catalog-browser";
import { IntegrationCard } from "@/components/integration-card";
import { translateCategory, translateProviderCategory, translateTag, type Locale } from "@/lib/i18n";
import { getProviderCategory, getTypeLabel } from "@/lib/provider-categories";
import { featuredIds, getCollection } from "@/lib/site";
import type { Integration } from "@/lib/types";

export async function toCatalogItems(integrations: Integration[], lang: Locale): Promise<CatalogItem[]> {
  return Promise.all(
    integrations.map(async (i) => {
      const featured = featuredIds.indexOf(i.id);
      // a provider is filed under its Casdoor category, such as OAuth or SMS
      const providerCategory = await getProviderCategory(i);
      const categories = providerCategory
        ? [translateProviderCategory(providerCategory, lang)]
        : i.categories.map((c) => translateCategory(c, lang));
      const tags = (i.tags ?? []).map((t) => translateTag(t, lang));
      // the English words stay searchable on translated pages
      const words = [i.name.en, i.description.en, await getTypeLabel(i, lang), ...categories, ...tags];
      if (lang !== "en") {
        words.push(...(providerCategory ? [providerCategory] : i.categories), ...(i.tags ?? []));
      }
      return {
        id: i.id,
        type: getCollection(i.type)?.type ?? i.type,
        name: i.name.en,
        text: words.join(" ").toLowerCase(),
        categories,
        tags,
        rank: featured === -1 ? featuredIds.length : featured,
        updated: i.versions.find((v) => v.version === i.latest)?.publishedAt ?? "",
        card: <IntegrationCard integration={i} lang={lang} />,
      };
    })
  );
}
