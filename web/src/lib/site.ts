import type { IntegrationType } from "@/lib/types";

// Public pages are served at www.casdoor.com/integrations through a rewrite in marketweb, so canonical URLs use www.
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.casdoor.com";

export const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "https://marketplace.casdoor.com";

export const typeLabels: Record<IntegrationType, string> = {
  app: "App integration",
  provider: "Provider template",
  theme: "Theme",
  action: "Action",
};

export const typeOrder: IntegrationType[] = ["app", "provider", "theme", "action"];
