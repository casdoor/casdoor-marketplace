import type { MetadataRoute } from "next";
import { htmlLangs, localePath, locales } from "@/lib/i18n";
import { getIntegrations } from "@/lib/integrations";
import { collections, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

type Entry = Omit<MetadataRoute.Sitemap[number], "url">;

// Every page once per language, each listing all its languages as alternates.
function localized(path: string, entry: Entry): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [htmlLangs[l], `${siteUrl}${localePath(l, path)}`]));
  return locales.map((lang) => ({ url: `${siteUrl}${localePath(lang, path)}`, alternates: { languages }, ...entry }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const integrations = await getIntegrations();
  return [
    ...localized("/", { changeFrequency: "weekly", priority: 1 }),
    ...collections.flatMap((c) => localized(`/${c.slug}/`, { changeFrequency: "weekly", priority: 0.8 })),
    ...integrations.flatMap((i) =>
      localized(`/integrations/${i.id}/`, {
        lastModified: i.versions.find((v) => v.version === i.latest)?.publishedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      })
    ),
  ];
}
