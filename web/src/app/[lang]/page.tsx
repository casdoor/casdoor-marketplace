import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Code2, PackageOpen, Sparkles } from "lucide-react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { HeroSearch, SearchProvider } from "@/components/catalog-search";
import { IntegrationCard } from "@/components/integration-card";
import { IntegrationLogo } from "@/components/integration-logo";
import { TypeIcon } from "@/components/type-icon";
import { buttonVariants } from "@/components/ui/button";
import { toCatalogItems } from "@/lib/catalog";
import { getIntegrations } from "@/lib/integrations";
import { getMessages, isLocale, languageAlternates, localePath, pageUrl, type Locale } from "@/lib/i18n";
import { collections, docsUrl, featuredIds, links } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return {};
  }
  const m = getMessages(lang);
  return {
    title: { absolute: m.home.title },
    description: m.home.description,
    alternates: { canonical: pageUrl(lang, "/"), languages: languageAlternates("/") },
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = (await params) as { lang: Locale };
  const m = getMessages(lang);
  const integrations = await getIntegrations();
  const featured = featuredIds
    .map((id) => integrations.find((i) => i.id === id))
    .filter((i) => i !== undefined)
    .slice(0, 3);
  const withLogos = integrations.filter((i) => i.logo).slice(0, 12);

  return (
    <SearchProvider>
      <section className="hero-backdrop relative overflow-hidden text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-7 px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-24">
          <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <Sparkles className="size-3.5 text-violet-300" />
            {m.home.badge}
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.05]">
            {m.home.titleBefore}
            <span className="bg-gradient-to-r from-violet-300 to-sky-300 bg-clip-text text-transparent">Casdoor</span>
            {m.home.titleAfter}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-white/70">
            {m.home.text}
          </p>
          <HeroSearch placeholder={m.home.searchPlaceholder} label={m.catalog.searchLabel} />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
            <span>
              <strong className="text-white tabular-nums">{integrations.length}</strong> {m.home.integrations}
            </span>
            <span>
              <strong className="text-white tabular-nums">{collections.length}</strong> {m.home.categories}
            </span>
            <span className="flex items-center gap-1">
              <BadgeCheck className="size-4 text-violet-300" />
              {m.home.checked}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {withLogos.map((i) => (
              <Link
                key={i.id}
                href={localePath(lang, `/integrations/${i.id}/`)}
                title={i.name.en}
                className="flex size-12 items-center justify-center rounded-xl bg-white p-2.5 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
              >
                <IntegrationLogo integration={i} className="size-7 p-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {collections.map((c) => {
            const n = integrations.filter((i) => i.type === c.type).length;
            return (
              <Link
                key={c.slug}
                href={localePath(lang, `/${c.slug}/`)}
                className="group flex flex-col gap-3 rounded-2xl border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <TypeIcon type={c.type} className="size-5" />
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">{n}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{m.collections[c.type].title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{m.collections[c.type].tagline}</p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                  {m.home.browse}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{m.home.featured}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{m.home.featuredText}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((i) => (
              <IntegrationCard key={i.id} integration={i} lang={lang} />
            ))}
          </div>
        </section>
      )}

      <section id="browse" className="scroll-mt-20 border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">{m.home.all}</h2>
          <CatalogBrowser items={toCatalogItems(integrations, lang)} lang={lang} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-8">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Code2 className="size-5" />
            </span>
            <h2 className="text-xl font-semibold">{m.home.buildTitle}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{m.home.buildText}</p>
            <a href={links.contribute} className={buttonVariants({ className: "w-fit" })}>
              {m.home.contribute}
              <ArrowRight />
            </a>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-8">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <PackageOpen className="size-5" />
            </span>
            <h2 className="text-xl font-semibold">{m.home.installTitle}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{m.home.installText}</p>
            <a href={docsUrl(lang, "basic/try-with-docker")} className={buttonVariants({ variant: "outline", className: "w-fit" })}>
              {m.home.getCasdoor}
              <ArrowRight />
            </a>
          </div>
        </div>
      </section>
    </SearchProvider>
  );
}
