# Casdoor Marketplace web

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, built as a static site: `npm run build` writes `build/`, which the Go backend in the repository root serves (CasWAF builds and runs both on the node).

## Data

The pages are built from the output of [casdoor-integrations](https://github.com/casdoor/casdoor-integrations). Before `dev` and `build`, `scripts/fetch-integrations.mjs` copies it into `public/data`, so the site also serves `index.json`, the bundles, logos and screenshots under `/data`:

- with `INTEGRATIONS_DIR` set, from that local `dist/` directory (after `npm run build` in casdoor-integrations);
- otherwise by cloning the `dist` branch of casdoor-integrations, which its CI updates on every push to master.

A change to casdoor-integrations shows up on the site at the next build of this repository.

## Development

```bash
npm install
INTEGRATIONS_DIR=../../casdoor-integrations/dist npm run dev
```

## Environment variables

| Name | Default | Purpose |
|---|---|---|
| `INTEGRATIONS_DIR` | (clone the dist branch) | Local `dist/` of casdoor-integrations |
| `NEXT_PUBLIC_SITE_URL` | `https://marketplace.casdoor.cn` | Base URL for canonical links, structured data and the sitemap |
