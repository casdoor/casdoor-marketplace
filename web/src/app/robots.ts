import type { MetadataRoute } from "next";
import { locales, siteUrls } from "@/lib/i18n";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/console/", "/zh/console/"] },
    sitemap: locales.map((l) => `${siteUrls[l]}/sitemap.xml`),
  };
}
