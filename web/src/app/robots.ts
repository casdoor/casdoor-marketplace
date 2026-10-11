import type { MetadataRoute } from "next";
import { locales, siteUrls } from "@/lib/i18n";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
    sitemap: locales.map((l) => `${siteUrls[l]}/sitemap.xml`),
  };
}
