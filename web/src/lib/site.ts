import type { Locale } from "@/lib/i18n";
import type { IntegrationType } from "@/lib/types";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://marketplace.casdoor.cn";

export type Collection = {
  slug: string;
  type: IntegrationType;
};

// Each type has its own browse page at /<slug>/; the titles and texts are in lib/i18n.ts.
export const collections: Collection[] = [
  { slug: "apps", type: "app" },
  { slug: "providers", type: "provider" },
  { slug: "themes", type: "theme" },
];

export function getCollection(type: IntegrationType): Collection | undefined {
  return collections.find((c) => c.type === type);
}

// Shown first on the home page and in the default sort.
export const featuredIds = ["grafana", "keycloak", "midnight", "gitlab", "authentik", "split"];

export const links = {
  github: "https://github.com/casdoor/casdoor-marketplace",
  integrations: "https://github.com/casdoor/casdoor-integrations",
  contribute: "https://github.com/casdoor/casdoor-integrations#readme",
  request: "https://github.com/casdoor/casdoor-integrations/issues/new",
  casdoor: "https://github.com/casdoor/casdoor",
  cloud: `https://admin.casdoor.com/signup?from=${encodeURIComponent("/instances/new?tier=basic&period=PostPaid")}`,
};

// Casdoor documentation in the page's language.
export function docsUrl(lang: Locale, path: string): string {
  return lang === "zh" ? `https://casdoor.ai/zh/docs/${path}/` : `https://casdoor.ai/docs/${path}`;
}
