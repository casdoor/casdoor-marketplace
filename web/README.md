# Casdoor Marketplace web

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui. `npm run build` writes a Next.js server to `build/standalone` (`output: "standalone"`, finished by `scripts/prepare-standalone.mjs`), which the Go backend in the repository root starts and proxies the pages to (CasWAF builds and runs both on the node). Pages are rendered for every request from the catalog the backend serves under `/data`.

## Data

The pages read the catalog from the backend (`MARKETPLACE_BACKEND_URL`, default `http://localhost:18300`), which serves it from MySQL under `/data`: `index.json`, the bundles, logos and screenshots. A new version shows up on the next request.

For frontend work without a database, `npm run dev` first runs `scripts/fetch-integrations.mjs`, which copies the build of [casdoor-integrations](https://github.com/casdoor/casdoor-integrations) into `public/data` for the backend to serve:

- with `INTEGRATIONS_DIR` set, from that local `dist/` directory (after `npm run build` in casdoor-integrations);
- otherwise by cloning the `dist` branch of casdoor-integrations.

## Languages

The site's interface is in English and Chinese. Pages live under `src/app/[lang]`; all interface text is in `src/lib/i18n.ts` (the Chinese dictionary is typed against the English one, so a missing string fails the build).

- English pages are at `/`, `/apps/`, `/integrations/<id>/`; Chinese ones at `/zh/`, `/zh/apps/`, `/zh/integrations/<id>/`. The pages live under `app/[lang]`, and the rewrites in `next.config.ts` serve the English ones at the root.
- Only the site's own text is translated. The integrations themselves (names, descriptions, guides) come from casdoor-integrations, which is English only, so they are in English on the Chinese pages too; the category and tag filters are translated in `i18n.ts`.
- Every page has `hreflang` alternates and the sitemap lists both languages.
- The backend redirects `/en/...` to the address without the prefix, and sends a visitor without a `lang` cookie whose browser prefers another of the site's languages from an English page to that language. The language menu in the header lists every language in `locales` and sets the cookie.

To add a language: add it to `locales` and `htmlLangs` in `src/lib/i18n.ts` with its dictionary (and to `siteUrls`, the host its pages are canonical on), and to `prefixedLanguages` in `routers/language.go`.

## Development

```bash
npm install
INTEGRATIONS_DIR=../../casdoor-integrations/dist npm run dev
```

## Environment variables

| Name | Default | Purpose |
|---|---|---|
| `MARKETPLACE_BACKEND_URL` | `http://localhost:18300` | The Go backend the pages read `/data` from (the backend sets it when it starts the server) |
| `INTEGRATIONS_DIR` | (clone the dist branch) | Local `dist/` of casdoor-integrations | for `npm run dev` |

The same build is served at marketplace.casdoor.com and marketplace.casdoor.cn. Canonical links, hreflang, structured data and the sitemap put English pages on the .com host and Chinese pages on the .cn host (`siteUrls` in `src/lib/i18n.ts`).
