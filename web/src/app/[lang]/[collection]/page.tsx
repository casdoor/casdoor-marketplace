import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/collection-view";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { collections } from "@/lib/site";

// rendered for every request from the catalog in the database (the backend serves it under /data)
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/[collection]">): Promise<Metadata> {
  const { lang, collection } = await params;
  const c = collections.find((x) => x.slug === collection);
  if (!c || !isLocale(lang)) {
    return {};
  }
  const text = getMessages(lang).collections[c.type];
  return pageMetadata(lang, `/${c.slug}/`, getMessages(lang).collection.title(text.title), text.description, {
    path: `/og/${c.slug}.png`,
  });
}

export default async function CollectionPage({ params }: PageProps<"/[lang]/[collection]">) {
  const { collection, lang } = (await params) as { collection: string; lang: Locale };
  const c = collections.find((x) => x.slug === collection);
  if (!c) {
    notFound();
  }
  return <CollectionView lang={lang} collection={c} />;
}
