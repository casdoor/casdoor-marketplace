import type { Locale } from "@/lib/i18n";
import type { IntegrationType } from "@/lib/types";

export type Collection = {
  slug: string;
  // names the collection's texts in lib/i18n.ts and its icon
  type: IntegrationType;
  // the integration types it lists: an action is a provider whose code runs in Casdoor
  types: IntegrationType[];
};

// Each collection has its own browse page at /<slug>/; the titles and texts are in lib/i18n.ts.
export const collections: Collection[] = [
  { slug: "apps", type: "app", types: ["app"] },
  { slug: "providers", type: "provider", types: ["provider", "action"] },
  { slug: "themes", type: "theme", types: ["theme"] },
];

export function getCollection(type: IntegrationType): Collection | undefined {
  return collections.find((c) => c.types.includes(type));
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
