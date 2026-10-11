import type { MetadataRoute } from "next";
import { locales, siteUrls } from "@/lib/i18n";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: locales.map((l) => `${siteUrls[l]}/sitemap.xml`),
  };
}
