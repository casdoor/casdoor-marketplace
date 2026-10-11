import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// `next build` writes a Next.js server to web/build/standalone (scripts/prepare-standalone.mjs finishes it), which the
// Go backend in the repository root starts and sends the pages to; the backend itself answers /api/ and /data/.
// Pages are under app/[lang]: English ones are served at the root through the rewrites below, Chinese ones under /zh/.
const nextConfig: NextConfig = {
  output: "standalone",
  distDir: "build",
  async rewrites() {
    return [
      // with `next dev`, the backend (go run main.go) answers the API and the catalog
      ...(isDev
        ? [
            { source: "/api/:path*", destination: "http://localhost:18300/api/:path*" },
            { source: "/data/:path*", destination: "http://localhost:18300/data/:path*" },
          ]
        : []),
      { source: "/", destination: "/en" },
      { source: "/:path((?!en(?:/|$)|zh(?:/|$)|admin(?:/|$)|api(?:/|$)|data(?:/|$)|og(?:/|$)|_next(?:/|$)).*)", destination: "/en/:path" },
    ];
  },
  trailingSlash: true,
  images: { unoptimized: true },
  // the backend compresses responses after putting the analytics into them
  compress: false,
  experimental: {
    globalNotFound: true,
  },
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
