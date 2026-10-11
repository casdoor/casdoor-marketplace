import type { MetadataRoute } from "next";
import { htmlLangs, locales, pageUrl } from "@/lib/i18n";
import { getIntegrations } from "@/lib/integrations";
import { collections } from "@/lib/site";
import type { Integration } from "@/lib/types";

export const dynamic = "force-static";

type Entry = Omit<MetadataRoute.Sitemap[number], "url">;

// Every page once per language at its canonical host, each listing all its languages as alternates. The same file is
// served on both hosts and robots.txt names both, which lets each host's sitemap list the other host's pages.
function localized(path: string, entry: Entry): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [htmlLangs[l], pageUrl(l, path)]));
  return locales.map((lang) => ({ url: pageUrl(lang, path), alternates: { languages }, ...entry }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const integrations = await getIntegrations();
  // when the newest of the integrations was published
  const published = (list: Integration[]) =>
    list
      .map((i) => i.versions.find((v) => v.version === i.latest)?.publishedAt ?? "")
      .sort()
      .at(-1) || undefined;
  return [
    ...localized("/", { lastModified: published(integrations), changeFrequency: "weekly", priority: 1 }),
    ...collections.flatMap((c) =>
      localized(`/${c.slug}/`, {
        lastModified: published(integrations.filter((i) => i.type === c.type)),
        changeFrequency: "weekly",
        priority: 0.8,
      })
    ),
    ...integrations.flatMap((i) =>
      localized(`/integrations/${i.id}/`, {
        lastModified: published([i]),
        changeFrequency: "monthly",
        priority: 0.6,
      })
    ),
  ];
}
