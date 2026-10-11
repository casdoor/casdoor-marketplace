import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// `next build` writes a static site to web/build, served by the Go + Beego backend in the repository root.
// Pages are under app/[lang]; scripts/move-default-locale.mjs then moves build/en to the root of build, so English
// pages keep their addresses and Chinese ones are under /zh/. `next dev` does the same with rewrites.
const nextConfig: NextConfig = {
  ...(isDev
    ? {
        async rewrites() {
          return [
            { source: "/", destination: "/en" },
            { source: "/:path((?!en(?:/|$)|zh(?:/|$)).*)", destination: "/en/:path" },
          ];
        },
      }
    : {
        output: "export",
        distDir: "build",
      }),
  // every page is <path>/index.html, served at <path>/
  trailingSlash: true,
  images: { unoptimized: true },
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
