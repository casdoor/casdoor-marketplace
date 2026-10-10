import type { IntegrationType } from "@/lib/types";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://marketplace.casdoor.cn";

export const typeLabels: Record<IntegrationType, string> = {
  app: "App integration",
  provider: "Provider template",
  theme: "Theme",
  action: "Action",
};

export const typeOrder: IntegrationType[] = ["app", "provider", "theme", "action"];
