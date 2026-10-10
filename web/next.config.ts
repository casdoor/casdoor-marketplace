import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // www.casdoor.com (marketweb) rewrites /integrations/* and /marketplace-static/* to this app (Multi-Zones).
  assetPrefix: "/marketplace-static",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
