import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { appSteps, GuideView, providerSteps } from "@/components/guide-view";
import { InlineText, plainText } from "@/components/inline-text";
import { IntegrationLogo } from "@/components/integration-logo";
import { ThemeView } from "@/components/theme-view";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getBundle, getIntegration, getIntegrations } from "@/lib/integrations";
import { siteUrl, typeLabels } from "@/lib/site";
import { exampleValues, fillVariables } from "@/lib/variables";

const othersHeading = {
  app: "Single sign-on for your other apps",
  provider: "Other identity providers",
  theme: "Other sign-in themes",
  action: "Other actions",
};

const freeTrialUrl = `https://admin.casdoor.com/signup?from=${encodeURIComponent("/instances/new?tier=basic&period=PostPaid")}`;
const selfHostUrl = "https://casdoor.ai/docs/basic/try-with-docker";

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
  const others = (await getIntegrations()).filter((i) => i.id !== integration.id && i.type === integration.type);

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

  return (
    <article className="flex flex-col gap-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
      />

      <header className="flex flex-col gap-6">
        <Link href="/integrations" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; All integrations
        </Link>
        <div className="flex items-start gap-4">
          <IntegrationLogo integration={integration} className="size-14" />
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              {integration.type === "theme" ? "Sign-in theme for Casdoor" : `${name} + Casdoor`}
              {integration.verified && <BadgeCheck className="size-4 text-primary" aria-label="Verified" />}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{guide?.headline ?? name}</h1>
          </div>
        </div>
        <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{guide?.summary ?? integration.description.en}</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={freeTrialUrl} className={buttonVariants({ size: "lg" })}>
            Get a Casdoor Cloud instance
          </a>
          <a href={selfHostUrl} className={buttonVariants({ variant: "outline", size: "lg" })}>
            Self-host for free
            <ArrowRight />
          </a>
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_16rem]">
        <div className="flex min-w-0 flex-col gap-12">
          {theme && <ThemeView integration={integration} manifest={manifest} theme={theme} />}
          {guide && application && (
            <GuideView name={name} steps={appSteps(name, application, guide)} guide={guide} values={values} />
          )}
          {guide && provider && (
            <GuideView name={name} steps={providerSteps(name, provider, guide)} guide={guide} values={values} />
          )}

          {guide?.faqs && guide.faqs.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
              <dl className="flex flex-col gap-5">
                {guide.faqs.map((f) => (
                  <div key={f.question}>
                    <dt className="font-semibold">{f.question}</dt>
                    <dd className="mt-1 leading-7 text-muted-foreground">
                      <InlineText text={fillVariables(f.answer, values)} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 text-sm lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{typeLabels[integration.type]}</Badge>
            {integration.categories.map((c) => (
              <Badge key={c} variant="outline">
                {c}
              </Badge>
            ))}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-muted-foreground">Version</dt>
            <dd>{manifest.version}</dd>
            <dt className="text-muted-foreground">Casdoor</dt>
            <dd>{manifest.casdoorVersion}</dd>
            <dt className="text-muted-foreground">Author</dt>
            <dd>{integration.author}</dd>
            <dt className="text-muted-foreground">License</dt>
            <dd>{integration.license}</dd>
          </dl>
          {integration.homepage && (
            <a href={integration.homepage} className="underline underline-offset-4" rel="noopener">
              {new URL(integration.homepage).hostname}
            </a>
          )}
          <a
            href={`https://github.com/casdoor/casdoor-integrations/tree/master/integrations/${integration.type}/${integration.id}`}
            className="underline underline-offset-4"
          >
            Edit on GitHub
          </a>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="flex flex-col gap-4 border-t pt-10">
          <h2 className="text-xl font-semibold tracking-tight">{othersHeading[integration.type]}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/integrations/${i.id}`}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/50"
                >
                  <IntegrationLogo integration={i} className="size-6 p-0 text-xs" />
                  {i.name.en}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
