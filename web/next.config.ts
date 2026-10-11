import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// `next build` writes a Next.js server to .next-build/standalone, which scripts/prepare-standalone.mjs moves to a new
// web/build/server-<time> on every build: the Go backend in the repository root starts the newest one and sends the pages
// to it (the backend itself answers /api/ and /data/), and a build never has to delete the server that is running.
// Pages are under app/[lang]: English ones are served at the root through the rewrites below, Chinese ones under /zh/.
const nextConfig: NextConfig = {
  output: "standalone",
  distDir: ".next-build",
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
