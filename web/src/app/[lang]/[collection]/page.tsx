import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { HeroSearch, SearchProvider } from "@/components/catalog-search";
import { TypeIcon } from "@/components/type-icon";
import { toCatalogItems } from "@/lib/catalog";
import { getMessages, htmlLangs, isLocale, localePath, pageUrl, type Locale } from "@/lib/i18n";
import { getIntegrations } from "@/lib/integrations";
import { breadcrumbList, jsonLd, pageMetadata } from "@/lib/metadata";
import { collections } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return collections.map((c) => ({ collection: c.slug }));
}

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
  const m = getMessages(lang);
  const text = m.collections[c.type];
  const integrations = (await getIntegrations()).filter((i) => i.type === c.type);

  const url = pageUrl(lang, `/${c.slug}/`);
  const graph = [
    {
      "@type": "CollectionPage",
      name: text.title,
      description: text.description,
      url,
      inLanguage: htmlLangs[lang],
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: integrations.length,
        itemListElement: integrations.map((i, n) => ({
          "@type": "ListItem",
          position: n + 1,
          name: i.name.en,
          url: pageUrl(lang, `/integrations/${i.id}/`),
        })),
      },
    },
    breadcrumbList([
      { name: m.siteName, url: pageUrl(lang, "/") },
      { name: text.title, url },
    ]),
  ];

  return (
    <SearchProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} />
      <section className="hero-backdrop text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-10 pb-12 sm:px-6">
          <nav className="flex items-center gap-1 text-sm text-white/60">
            <Link href={localePath(lang, "/")} className="hover:text-white">
              {m.header.badge}
            </Link>
            <ChevronRight className="size-4" />
            <span className="text-white">{text.title}</span>
          </nav>
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <TypeIcon type={c.type} className="size-7 text-violet-200" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{text.title}</h1>
              <p className="mt-1 text-white/70">{text.tagline}</p>
            </div>
          </div>
          <p className="max-w-3xl leading-7 text-white/70">{text.description}</p>
          <HeroSearch placeholder={m.collection.searchPlaceholder(text.title)} label={m.catalog.searchLabel} />
        </div>
      </section>

      <section id="browse" className="scroll-mt-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <CatalogBrowser items={toCatalogItems(integrations, lang)} lang={lang} showTypes={false} />
        </div>
      </section>
    </SearchProvider>
  );
}
