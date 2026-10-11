import type { Metadata } from "next";
import { getMessages, languageAlternates, pageUrl, siteUrls, type Locale } from "@/lib/i18n";

const ogLocales: Record<Locale, string> = { en: "en_US", zh: "zh_CN" };

// The share image is 1200x630 unless the page says otherwise (theme pages use their screenshot).
export type ShareImage = { path: string; width?: number; height?: number };

// Title, description, canonical, hreflang and the Open Graph and Twitter tags of the page at `path` (the English
// address). A page's `openGraph` replaces the layout's rather than merging with it, so every page builds all of it here.
export function pageMetadata(lang: Locale, path: string, title: string, description: string, image: ShareImage): Metadata {
  const url = pageUrl(lang, path);
  const images = [{ url: `${siteUrls[lang]}${image.path}`, width: image.width ?? 1200, height: image.height ?? 630, alt: title }];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: getMessages(lang).siteName,
      locale: ogLocales[lang],
      title,
      description,
      url,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export function jsonLd(graph: object[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

export function breadcrumbList(items: { name: string; url: string }[]): object {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}
