import type { IntegrationType } from "@/lib/types";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://marketplace.casdoor.cn";

export const typeLabels: Record<IntegrationType, string> = {
  app: "App integration",
  provider: "Identity provider",
  theme: "Sign-in theme",
  action: "Action",
};

export type Collection = {
  slug: string;
  type: IntegrationType;
  title: string;
  tagline: string;
  description: string;
};

// Each type has its own browse page at /<slug>/.
export const collections: Collection[] = [
  {
    slug: "apps",
    type: "app",
    title: "App integrations",
    tagline: "Single sign-on for the apps you run",
    description:
      "Step-by-step single sign-on for self-hosted apps: the Casdoor application to create and the settings on the app's side, down to group and role mapping.",
  },
  {
    slug: "providers",
    type: "provider",
    title: "Identity providers",
    tagline: "Sign in with accounts people already have",
    description:
      "Ready-made sign-in providers for Casdoor: the endpoints and claims are filled in, and the guide covers registering Casdoor on the other side.",
  },
  {
    slug: "themes",
    type: "theme",
    title: "Sign-in themes",
    tagline: "Make the sign-in page yours",
    description:
      "Looks for Casdoor's sign-in pages, tested on a real Casdoor. Pick your colors and apply them with Import JSON in the application editor.",
  },
];

export function getCollection(type: IntegrationType): Collection | undefined {
  return collections.find((c) => c.type === type);
}

// Shown first on the home page and in the default sort.
export const featuredIds = ["grafana", "keycloak", "midnight", "gitlab", "authentik", "split"];

export const links = {
  docs: "https://casdoor.ai/docs/overview",
  github: "https://github.com/casdoor/casdoor-marketplace",
  integrations: "https://github.com/casdoor/casdoor-integrations",
  contribute: "https://github.com/casdoor/casdoor-integrations#readme",
  request: "https://github.com/casdoor/casdoor-integrations/issues/new",
  casdoor: "https://github.com/casdoor/casdoor",
  cloud: `https://admin.casdoor.com/signup?from=${encodeURIComponent("/instances/new?tier=basic&period=PostPaid")}`,
  selfHost: "https://casdoor.ai/docs/basic/try-with-docker",
};
