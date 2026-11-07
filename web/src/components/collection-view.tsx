import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { HeroSearch, SearchProvider } from "@/components/catalog-search";
import { TypeIcon } from "@/components/type-icon";
import { toCatalogItems } from "@/lib/catalog";
import { getMessages, htmlLangs, localePath, pageUrl, translateProviderCategory, type Locale } from "@/lib/i18n";
import { getIntegrations } from "@/lib/integrations";
import { breadcrumbList, jsonLd } from "@/lib/metadata";
import { countProviderCategories, getProviderCategory, type ProviderCategory } from "@/lib/provider-categories";
import type { Collection } from "@/lib/site";

// The browse page of a collection, or of one Casdoor category of the providers, with links to the other categories.
export async function CollectionView({ lang, collection, category }: { lang: Locale; collection: Collection; category?: ProviderCategory }) {
  const m = getMessages(lang);
  const text = m.collections[collection.type];
  const all = (await getIntegrations(lang)).filter((i) => collection.types.includes(i.type));
  const categories = collection.type === "provider" ? await countProviderCategories(all) : [];
  const integrations = category
    ? (await Promise.all(all.map(async (i) => ((await getProviderCategory(i)) === category.name ? i : undefined)))).filter((i) => i !== undefined)
    : all;

  const categoryName = category ? translateProviderCategory(category.name, lang) : "";
  const title = category ? m.providerCollection.title(categoryName) : text.title;
  const description = category ? m.providerCollection.description(categoryName) : text.description;
  const collectionPath = `/${collection.slug}/`;
  const path = category ? `${collectionPath}${category.slug}/` : collectionPath;
  const url = pageUrl(lang, path);

  const graph = [
    {
      "@type": "CollectionPage",
      name: title,
      description,
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
      { name: text.title, url: pageUrl(lang, collectionPath) },
      ...(category ? [{ name: title, url }] : []),
    ]),
  ];

  const tab = (href: string, label: string, count: number, active: boolean) => (
    <Link
      key={href}
      href={localePath(lang, href)}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
        active ? "bg-white font-medium text-slate-900" : "bg-white/10 text-white/80 ring-1 ring-white/15 hover:bg-white/20 hover:text-white"
      }`}
    >
      {label}
      <span className={`text-xs tabular-nums ${active ? "text-slate-500" : "text-white/50"}`}>{count}</span>
    </Link>
  );

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
            {category ? (
              <>
                <Link href={localePath(lang, collectionPath)} className="hover:text-white">
                  {text.title}
                </Link>
                <ChevronRight className="size-4" />
                <span className="text-white">{categoryName}</span>
              </>
            ) : (
              <span className="text-white">{text.title}</span>
            )}
          </nav>
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <TypeIcon type={collection.type} className="size-7 text-violet-200" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              {!category && <p className="mt-1 text-white/70">{text.tagline}</p>}
            </div>
          </div>
          <p className="max-w-3xl leading-7 text-white/70">{description}</p>
          {categories.length > 0 && (
            <nav className="flex flex-wrap gap-2">
              {tab(collectionPath, m.providerCollection.all, all.length, !category)}
              {categories.map((c) =>
                tab(`${collectionPath}${c.category.slug}/`, translateProviderCategory(c.category.name, lang), c.count, c.category.slug === category?.slug)
              )}
            </nav>
          )}
          <HeroSearch
            placeholder={category ? m.providerCollection.searchPlaceholder(categoryName) : m.collection.searchPlaceholder(title)}
            label={m.catalog.searchLabel}
          />
        </div>
      </section>

      <section id="browse" className="scroll-mt-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <CatalogBrowser items={await toCatalogItems(integrations, lang)} lang={lang} showTypes={false} />
        </div>
      </section>
    </SearchProvider>
  );
}
