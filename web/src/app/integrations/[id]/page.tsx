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
import { getBundle, getIntegration, getIntegrations } from "@/lib/integrations";
import { getCollection, links, siteUrl, typeLabels } from "@/lib/site";
import { exampleValues, fillVariables } from "@/lib/variables";

// The site is a static export: every integration is a page built from the index, nothing else exists.
export const dynamicParams = false;

export async function generateStaticParams() {
  const integrations = await getIntegrations();
  return integrations.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/integrations/[id]">): Promise<Metadata> {
  const { id } = await params;
  const integration = await getIntegration(id);
  if (!integration) {
    return {};
  }

  const guide = (await getBundle(integration)).files["guide.json"];
  const title =
    guide?.title ??
    (integration.type === "theme"
      ? `${integration.name.en}: a Sign-in Page Theme for Casdoor`
      : `${integration.name.en} ${typeLabels[integration.type]} | Casdoor`);
  const url = `/integrations/${integration.id}/`;
  return {
    title: { absolute: title },
    description: integration.description.en,
    alternates: { canonical: url },
    openGraph: { title, description: integration.description.en, url },
  };
}

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function IntegrationPage({ params }: PageProps<"/integrations/[id]">) {
  const { id } = await params;
  const integration = await getIntegration(id);
  if (!integration) {
    notFound();
  }

  const { manifest, files } = await getBundle(integration);
  const guide = files["guide.json"];
  const application = files["application.json"];
  const provider = files["provider.json"];
  const theme = files["theme.json"];
  const values = exampleValues(manifest);
  const name = integration.name.en;
  const collection = getCollection(integration.type);
  const sourceUrl = `${links.integrations}/tree/master/integrations/${integration.type}/${integration.id}`;
  const related = (await getIntegrations()).filter((i) => i.id !== integration.id && i.type === integration.type).slice(0, 3);

  const graph: object[] = [
    {
      "@type": "SoftwareApplication",
      name: `${name} ${typeLabels[integration.type]} for Casdoor`,
      description: integration.description.en,
      applicationCategory: "SecurityApplication",
      softwareVersion: integration.latest,
      url: `${siteUrl}/integrations/${integration.id}/`,
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

  const details = [
    {
      label: "Type",
      value: collection ? (
        <Link href={`/${collection.slug}`} className="text-primary hover:underline">
          {typeLabels[integration.type]}
        </Link>
      ) : (
        typeLabels[integration.type]
      ),
    },
    { label: "Category", value: integration.categories.join(", ") },
    { label: "Version", value: manifest.version },
    { label: "Casdoor", value: manifest.casdoorVersion },
    ...(guide ? [{ label: "Checked", value: formatMonth(guide.checkedOn) }] : []),
    { label: "Author", value: integration.author === "casdoor" ? "Casdoor team" : integration.author },
    { label: "License", value: integration.license },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
      />

      <section className="border-b bg-gradient-to-b from-accent/70 via-accent/20 to-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 pb-10 sm:px-6">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Marketplace
            </Link>
            <ChevronRight className="size-4" />
            {collection && (
              <>
                <Link href={`/${collection.slug}`} className="hover:text-foreground">
                  {collection.title}
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
                {name} · {typeLabels[integration.type]}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{guide?.headline ?? name}</h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{guide?.summary ?? integration.description.en}</p>
              <div className="flex flex-wrap items-center gap-2">
                {integration.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="size-3.5" />
                    Verified by Casdoor
                  </span>
                )}
                {(integration.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <a href="#setup" className={buttonVariants({ size: "lg" })}>
                  {integration.type === "theme" ? "Apply this theme" : "Set it up"}
                  <ArrowRight />
                </a>
                <a href={sourceUrl} className={buttonVariants({ size: "lg", variant: "outline" })}>
                  <GitHubIcon className="size-4" />
                  View source
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-14">
          <div id="setup" className="scroll-mt-24">
            {theme && <ThemeView integration={integration} manifest={manifest} theme={theme} />}
            {guide && application && (
              <GuideView name={name} steps={appSteps(name, application, guide)} guide={guide} values={values} />
            )}
            {guide && provider && (
              <GuideView name={name} steps={providerSteps(name, provider, guide)} guide={guide} values={values} />
            )}
          </div>

          {guide?.faqs && guide.faqs.length > 0 && (
            <section id="faq" className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
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
              Install
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              One-click install from the Casdoor console is on the way. For now, follow the steps on this page; they
              take a few minutes.
            </p>
            <a href="#setup" className={buttonVariants({ className: "mt-4 w-full" })}>
              {integration.type === "theme" ? "Apply this theme" : "Go to the steps"}
            </a>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Details</h2>
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
                Source on GitHub
                <GitHubIcon className="size-3.5" />
              </a>
              <a
                href={`${links.request}?title=${encodeURIComponent(`${name}: `)}`}
                className="flex items-center justify-between text-muted-foreground hover:text-foreground"
              >
                Report a problem
                <Flag className="size-3.5" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-accent to-background p-5">
            <h2 className="font-semibold">New to Casdoor?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Open-source identity and access management with SSO, MFA and social login.</p>
            <div className="mt-3 flex flex-col gap-2">
              <a href={links.selfHost} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Self-host for free
              </a>
              <a href={links.cloud} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Try Casdoor Cloud
              </a>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && collection && (
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">More {collection.title.toLowerCase()}</h2>
              <Link href={`/${collection.slug}`} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((i) => (
                <IntegrationCard key={i.id} integration={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
