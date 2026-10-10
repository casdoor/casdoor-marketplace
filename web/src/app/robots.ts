import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// This file is only reached at marketplace.casdoor.com; www.casdoor.com/robots.txt comes from marketweb.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/integrations", disallow: "/" },
    sitemap: `${siteUrl}/integrations/sitemap.xml`,
  };
}
