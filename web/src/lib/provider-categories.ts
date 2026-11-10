import { getMessages, translateProviderCategory, type Locale } from "@/lib/i18n";
import { getBundle } from "@/lib/integrations";
import { getCollection } from "@/lib/site";
import type { Integration } from "@/lib/types";

export type ProviderCategory = {
  // as in Casdoor's provider editor
  name: string;
  slug: string;
};

// Casdoor's provider categories, in the order of its provider editor; the pages at /providers/<slug>/ list one each.
export const providerCategories: ProviderCategory[] = [
  { name: "Audit", slug: "audit" },
  { name: "Captcha", slug: "captcha" },
  { name: "Email", slug: "email" },
  { name: "Face ID", slug: "face-id" },
  { name: "ID Verification", slug: "id-verification" },
  { name: "Log", slug: "log" },
  { name: "MFA", slug: "mfa" },
  { name: "Notification", slug: "notification" },
  { name: "OAuth", slug: "oauth" },
  { name: "Payment", slug: "payment" },
  { name: "SAML", slug: "saml" },
  { name: "Scan", slug: "scan" },
  { name: "SMS", slug: "sms" },
  { name: "Storage", slug: "storage" },
];

// the category of the provider Casdoor adds for each kind of action
const actionCategories: Record<string, string> = {
  idp: "OAuth",
  idv: "ID Verification",
  payment: "Payment",
  push: "Notification",
  sms: "SMS",
};

// a published version never changes, so the category is read from its bundle once
const categoryByVersion = new Map<string, string>();

// The Casdoor category of the provider an integration adds: from provider.json, or from the kind of an action.
export async function getProviderCategory(integration: Integration): Promise<string | undefined> {
  if (integration.type !== "provider" && integration.type !== "action") {
    return undefined;
  }
  const key = `${integration.id}@${integration.latest}`;
  if (!categoryByVersion.has(key)) {
    const { files } = await getBundle(integration);
    const category =
      integration.type === "provider" ? files["provider.json"]?.category : actionCategories[files["action.json"]?.kind ?? ""];
    categoryByVersion.set(key, category ?? "");
  }
  return categoryByVersion.get(key) || undefined;
}

export function getProviderCategoryByName(name: string | undefined): ProviderCategory | undefined {
  return providerCategories.find((c) => c.name === name);
}

// The categories that have providers among `integrations`, with how many, in Casdoor's order.
export async function countProviderCategories(integrations: Integration[]): Promise<{ category: ProviderCategory; count: number }[]> {
  const names = await Promise.all(integrations.map(getProviderCategory));
  return providerCategories
    .map((category) => ({ category, count: names.filter((n) => n === category.name).length }))
    .filter((c) => c.count > 0);
}

// What an integration is, on its card and page: "SMS provider", "App integration", "Sign-in theme".
export async function getTypeLabel(integration: Integration, lang: Locale): Promise<string> {
  const m = getMessages(lang);
  const category = await getProviderCategory(integration);
  if (category) {
    return m.providerLabel(translateProviderCategory(category, lang));
  }
  return m.typeLabels[getCollection(integration.type)?.type ?? integration.type];
}
