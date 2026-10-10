import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// `next build` writes a static site to web/build, served by the Go + Beego backend in the repository root.
const nextConfig: NextConfig = {
  ...(isDev
    ? {}
    : {
        output: "export",
        distDir: "build",
      }),
  // every page is <path>/index.html, served at <path>/
  trailingSlash: true,
  images: { unoptimized: true },
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
