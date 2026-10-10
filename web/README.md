# Casdoor Marketplace web

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.

- Public pages live under `/integrations` and are served at `www.casdoor.com/integrations` through a rewrite in the www.casdoor.com site (Multi-Zones). That is why `assetPrefix` is `/marketplace-static` and canonical URLs point at www.
- Everything else (sign-in, upload, review) is served at `marketplace.casdoor.com` and is not indexed.

## Development

```bash
npm install
npm run dev
```

The pages read the build of [casdoor-integrations](https://github.com/casdoor/casdoor-integrations). Without `INTEGRATIONS_BASE_URL` they read a local checkout next to this repository, so build it first:

```bash
cd ../../casdoor-integrations
npm ci
npm run build
```

## Environment variables

| Name | Default | Purpose |
|---|---|---|
| `INTEGRATIONS_BASE_URL` | (local checkout) | URL of the published `dist/` directory of casdoor-integrations (the one holding `index.json`) |
| `INTEGRATIONS_DIR` | `../../casdoor-integrations/dist` | Local `dist/` directory, used when `INTEGRATIONS_BASE_URL` is not set |
| `NEXT_PUBLIC_SITE_URL` | `https://www.casdoor.com` | Base URL for canonical links and the sitemap |
| `NEXT_PUBLIC_MARKETPLACE_URL` | `https://marketplace.casdoor.com` | Base URL of the developer console and API |

## Rewrites on www.casdoor.com

```js
async rewrites() {
  return [
    { source: "/integrations", destination: `${MARKETPLACE_URL}/integrations` },
    { source: "/integrations/:path+", destination: `${MARKETPLACE_URL}/integrations/:path+` },
    { source: "/marketplace-static/:path+", destination: `${MARKETPLACE_URL}/marketplace-static/:path+` },
  ];
}
```
