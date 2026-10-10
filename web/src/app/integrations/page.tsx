import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
import { IntegrationCard } from "@/components/integration-card";
import { getIntegrations } from "@/lib/integrations";

export async function generateMetadata(): Promise<Metadata> {
  const names = (await getIntegrations()).filter((i) => i.type === "app").map((i) => i.name.en);
  return {
    title: { absolute: "Casdoor Integrations: App SSO, Identity Providers and Themes" },
    description: `Single sign-on guides for ${names.slice(0, -1).join(", ")} and ${names.at(-1)}, ready-made identity providers such as Keycloak and authentik, and sign-in page themes for Casdoor.`,
    alternates: { canonical: "/integrations/" },
  };
}

export default async function IntegrationsPage() {
  const integrations = await getIntegrations();
  const items = integrations.map((i) => ({
    id: i.id,
    type: i.type,
    text: `${i.name.en} ${i.description.en} ${i.categories.join(" ")}`.toLowerCase(),
    card: <IntegrationCard integration={i} />,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Casdoor integrations</h1>
        <p className="max-w-2xl text-muted-foreground">
          Single sign-on for the apps you run, with what to set in Casdoor and in the app; identity providers your
          users already have accounts with, ready to add to Casdoor; and themes for your sign-in pages.
        </p>
      </div>
      <Catalog items={items} />
      <p className="max-w-2xl text-sm text-muted-foreground">
        Using something else? Any app that supports OpenID Connect, OAuth 2.0, SAML, CAS or LDAP can sign in with
        Casdoor. The{" "}
        <a href="https://casdoor.ai/docs/category/integrations" className="underline underline-offset-4">
          Casdoor documentation
        </a>{" "}
        covers dozens more, from Jenkins and Jira to Kubernetes and APISIX.
      </p>
    </div>
  );
}
