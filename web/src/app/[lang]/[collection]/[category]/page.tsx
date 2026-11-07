import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/collection-view";
import { getMessages, isLocale, translateProviderCategory, type Locale } from "@/lib/i18n";
import { getIntegrations } from "@/lib/integrations";
import { pageMetadata } from "@/lib/metadata";
import { countProviderCategories } from "@/lib/provider-categories";
import { getCollection } from "@/lib/site";

// rendered for every request from the catalog in the database (the backend serves it under /data)
export const dynamic = "force-dynamic";

// The providers of one Casdoor category, such as /providers/sms/; only categories that have providers have a page.
async function findCategory(lang: Locale, collection: string, slug: string) {
  const providers = getCollection("provider");
  if (!providers || collection !== providers.slug) {
    return undefined;
  }
  const integrations = (await getIntegrations(lang)).filter((i) => providers.types.includes(i.type));
  const category = (await countProviderCategories(integrations)).find((c) => c.category.slug === slug)?.category;
  return category ? { collection: providers, category } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[collection]/[category]">): Promise<Metadata> {
  const { lang, collection, category } = await params;
  if (!isLocale(lang)) {
    return {};
  }
  const found = await findCategory(lang, collection, category);
  if (!found) {
    return {};
  }
  const m = getMessages(lang);
  const name = translateProviderCategory(found.category.name, lang);
  return pageMetadata(
    lang,
    `/${found.collection.slug}/${found.category.slug}/`,
    m.collection.title(m.providerCollection.title(name)),
    m.providerCollection.description(name),
    { path: `/og/${found.collection.slug}.png` }
  );
}

export default async function ProviderCategoryPage({ params }: PageProps<"/[lang]/[collection]/[category]">) {
  const { lang, collection, category } = (await params) as { lang: Locale; collection: string; category: string };
  const found = await findCategory(lang, collection, category);
  if (!found) {
    notFound();
  }
  return <CollectionView lang={lang} collection={found.collection} category={found.category} />;
}
