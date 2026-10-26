import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, ChevronDown, ChevronRight, ExternalLink, Flag, PackageOpen } from "lucide-react";
import { appSteps, GuideView, providerSteps } from "@/components/guide-view";
import { InlineText, plainText } from "@/components/inline-text";
import { IntegrationCard } from "@/components/integration-card";
import { IntegrationLogo } from "@/components/integration-logo";
import { GitHubIcon } from "@/components/site-header";
import { ThemeView } from "@/components/theme-view";
import { TypeIcon } from "@/components/type-icon";
import { buttonVariants } from "@/components/ui/button";
import {
  formatMonth,
  getMessages,
  htmlLangs,
  isLocale,
  localePath,
  pageUrl,
  translateCategory,
  translateTag,
  type Locale,
} from "@/lib/i18n";
import { getBundle, getIntegration, getIntegrations, languagesOf } from "@/lib/integrations";
import { breadcrumbList, jsonLd, pageMetadata, type ShareImage } from "@/lib/metadata";
import { docsUrl, getCollection, links } from "@/lib/site";
import type { Integration } from "@/lib/types";
import { exampleValues, fillVariables } from "@/lib/variables";

// rendered for every request from the catalog in the database (the backend serves it under /data)
export const dynamic = "force-dynamic";

// Themes are shared with their screenshot (1280x800), everything else with its image from /og/integrations/.
function shareImageOf(integration: Integration): ShareImage {
  const screenshot = integration.type === "theme" ? integration.screenshots?.[0] : undefined;
  return screenshot ? { path: `/data/${screenshot}`, width: 1280, height: 800 } : { path: `/og/integrations/${integration.id}.png` };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/integrations/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) {
    return {};
  }
  const integration = await getIntegration(id, lang);
  if (!integration) {
    return {};
  }

  const m = getMessages(lang);
  const guide = (await getBundle(integration)).files["guide.json"];
  const name = integration.name.en;
  const title = m.integration.pageTitle(
    integration.type,
    name,
    guide?.title ??
      (integration.type === "theme" ? m.integration.themeTitle(name) : m.integration.title(name, m.typeLabels[integration.type]))
  );
  const description = m.integration.pageDescription(integration.type, name, integration.description.en);
  return pageMetadata(lang, `/integrations/${integration.id}/`, title, description, shareImageOf(integration), languagesOf(integration));
}

export default async function IntegrationPage({ params }: PageProps<"/[lang]/integrations/[id]">) {
  const { lang, id } = (await params) as { lang: Locale; id: string };
  const integration = await getIntegration(id, lang);
  if (!integration) {
    notFound();
  }

  const m = getMessages(lang);
  const t = m.integration;
  const bundle = await getBundle(integration);
  const { manifest, files } = bundle;
  const guide = files["guide.json"];
  const application = files["application.json"];
  const provider = files["provider.json"];
  const theme = files["theme.json"];
  const values = exampleValues(manifest);
  const name = integration.name.en;
  const description = integration.description.en;
  const url = pageUrl(lang, `/integrations/${integration.id}/`);
  const typeLabel = m.typeLabels[integration.type];
  const collection = getCollection(integration.type);
  const collectionTitle = collection ? m.collections[collection.type].title : "";
  const collectionHref = collection ? localePath(lang, `/${collection.slug}/`) : "";
  const sourceUrl = `${links.integrations}/tree/master/integrations/${integration.type}/${integration.id}`;
  const related = (await getIntegrations(lang)).filter((i) => i.id !== integration.id && i.type === integration.type).slice(0, 3);

  const graph: object[] = [
    {
      "@type": "SoftwareApplication",
      name: t.structuredName(name, typeLabel),
      description: t.pageDescription(integration.type, name, description),
      inLanguage: htmlLangs[lang],
      applicationCategory: "SecurityApplication",
      softwareVersion: integration.latest,
      url,
      image: pageUrl("en", shareImageOf(integration).path),
      author: { "@type": "Organization", name: integration.author },
      offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    },
  ];
  if (guide?.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: guide.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: plainText(fillVariables(f.answer, values)) },
      })),
    });
  }

  graph.push(
    breadcrumbList([
      { name: m.siteName, url: pageUrl(lang, "/") },
      ...(collection ? [{ name: collectionTitle, url: pageUrl(lang, `/${collection.slug}/`) }] : []),
      { name, url },
    ])
  );

  const details = [
    {
      label: t.type,
      value: collection ? (
        <Link href={collectionHref} className="text-primary hover:underline">
          {typeLabel}
        </Link>
      ) : (
        typeLabel
      ),
    },
    { label: t.category, value: integration.categories.map((c) => translateCategory(c, lang)).join(m.guide.sourcesSeparator) },
    { label: t.version, value: manifest.version },
    { label: t.casdoor, value: manifest.casdoorVersion },
    ...(guide ? [{ label: t.checked, value: formatMonth(guide.checkedOn, lang) }] : []),
    { label: t.author, value: integration.author === "casdoor" ? t.casdoorTeam : integration.author },
    { label: t.license, value: integration.license },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(graph) }}
      />

      <section className="border-b bg-gradient-to-b from-accent/70 via-accent/20 to-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 pb-10 sm:px-6">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href={localePath(lang, "/")} className="hover:text-foreground">
              {m.header.badge}
            </Link>
            <ChevronRight className="size-4" />
            {collection && (
              <>
                <Link href={collectionHref} className="hover:text-foreground">
                  {collectionTitle}
                </Link>
                <ChevronRight className="size-4" />
              </>
            )}
            <span className="text-foreground">{name}</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border bg-background p-3 shadow-sm">
              <IntegrationLogo integration={integration} className="size-14 p-0 text-2xl" />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <TypeIcon type={integration.type} className="size-4" />
                {name}
                {m.separator}
                {typeLabel}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.headline(integration.type, name, guide?.headline ?? name)}</h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{guide?.summary ?? description}</p>
              <div className="flex flex-wrap items-center gap-2">
                {integration.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="size-3.5" />
                    {t.verified}
                  </span>
                )}
                {(integration.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {translateTag(tag, lang)}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <a href="#setup" className={buttonVariants({ size: "lg" })}>
                  {integration.type === "theme" ? t.applyTheme : t.setUp}
                  <ArrowRight />
                </a>
                <a href={sourceUrl} className={buttonVariants({ size: "lg", variant: "outline" })}>
                  <GitHubIcon className="size-4" />
                  {t.viewSource}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-14">
          <div id="setup" className="scroll-mt-24">
            {theme && <ThemeView integration={integration} manifest={manifest} theme={theme} lang={lang} />}
            {guide && application && (
              <GuideView name={name} steps={appSteps(name, application, guide, lang)} guide={guide} values={values} lang={lang} />
            )}
            {guide && provider && (
              <GuideView name={name} steps={providerSteps(name, provider, guide, lang)} guide={guide} values={values} lang={lang} />
            )}
          </div>

          {guide?.faqs && guide.faqs.length > 0 && (
            <section id="faq" className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">{t.faq}</h2>
              <div className="divide-y rounded-xl border bg-card">
                {guide.faqs.map((f) => (
                  <details key={f.question} className="group px-5 py-4" open>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                      {f.question}
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-2 leading-7 text-muted-foreground">
                      <InlineText text={fillVariables(f.answer, values)} />
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <PackageOpen className="size-4 text-primary" />
              {t.install}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.installText}</p>
            <a href="#setup" className={buttonVariants({ className: "mt-4 w-full" })}>
              {integration.type === "theme" ? t.applyTheme : t.goToSteps}
            </a>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">{t.details}</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              {details.map((d) => (
                <div key={d.label} className="contents">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="text-right">{d.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm">
              {integration.homepage && (
                <a href={integration.homepage} rel="noopener" className="flex items-center justify-between text-muted-foreground hover:text-foreground">
                  {new URL(integration.homepage).hostname}
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              <a href={sourceUrl} className="flex items-center justify-between text-muted-foreground hover:text-foreground">
                {t.sourceOnGitHub}
                <GitHubIcon className="size-3.5" />
              </a>
              <a
                href={`${links.request}?title=${encodeURIComponent(`${integration.name.en}: `)}`}
                className="flex items-center justify-between text-muted-foreground hover:text-foreground"
              >
                {t.reportProblem}
                <Flag className="size-3.5" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-accent to-background p-5">
            <h2 className="font-semibold">{t.newTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.newText}</p>
            <div className="mt-3 flex flex-col gap-2">
              <a href={docsUrl(lang, "basic/try-with-docker")} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t.selfHost}
              </a>
              <a href={links.cloud} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {t.tryCloud}
              </a>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && collection && (
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">{t.more(collectionTitle)}</h2>
              <Link href={collectionHref} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                {t.viewAll}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((i) => (
                <IntegrationCard key={i.id} integration={i} lang={lang} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
