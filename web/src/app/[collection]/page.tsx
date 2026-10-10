import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { HeroSearch, SearchProvider } from "@/components/catalog-search";
import { TypeIcon } from "@/components/type-icon";
import { toCatalogItems } from "@/lib/catalog";
import { getIntegrations } from "@/lib/integrations";
import { collections } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return collections.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[collection]">): Promise<Metadata> {
  const { collection } = await params;
  const c = collections.find((x) => x.slug === collection);
  if (!c) {
    return {};
  }
  return {
    title: { absolute: `${c.title} for Casdoor | Casdoor Marketplace` },
    description: c.description,
    alternates: { canonical: `/${c.slug}/` },
  };
}

export default async function CollectionPage({ params }: PageProps<"/[collection]">) {
  const { collection } = await params;
  const c = collections.find((x) => x.slug === collection);
  if (!c) {
    notFound();
  }
  const integrations = (await getIntegrations()).filter((i) => i.type === c.type);

  return (
    <SearchProvider>
      <section className="hero-backdrop text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-10 pb-12 sm:px-6">
          <nav className="flex items-center gap-1 text-sm text-white/60">
            <Link href="/" className="hover:text-white">
              Marketplace
            </Link>
            <ChevronRight className="size-4" />
            <span className="text-white">{c.title}</span>
          </nav>
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <TypeIcon type={c.type} className="size-7 text-violet-200" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{c.title}</h1>
              <p className="mt-1 text-white/70">{c.tagline}</p>
            </div>
          </div>
          <p className="max-w-3xl leading-7 text-white/70">{c.description}</p>
          <HeroSearch placeholder={`Search ${c.title.toLowerCase()}...`} />
        </div>
      </section>

      <section id="browse" className="scroll-mt-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <CatalogBrowser items={toCatalogItems(integrations)} showTypes={false} />
        </div>
      </section>
    </SearchProvider>
  );
}
