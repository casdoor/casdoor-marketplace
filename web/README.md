# Casdoor Marketplace web

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, built as a static site: `npm run build` writes `build/`, which the Go backend in the repository root serves (CasWAF builds and runs both on the node).

## Data

The pages are built from the output of [casdoor-integrations](https://github.com/casdoor/casdoor-integrations). Before `dev` and `build`, `scripts/fetch-integrations.mjs` copies it into `public/data`, so the site also serves `index.json`, the bundles, logos and screenshots under `/data`:

- with `INTEGRATIONS_DIR` set, from that local `dist/` directory (after `npm run build` in casdoor-integrations);
- otherwise by cloning the `dist` branch of casdoor-integrations, which its CI updates on every push to master.

A change to casdoor-integrations shows up on the site at the next build of this repository.

## Languages

The site's interface is in English and Chinese. Pages live under `src/app/[lang]`; all interface text is in `src/lib/i18n.ts` (the Chinese dictionary is typed against the English one, so a missing string fails the build).

- English pages are at `/`, `/apps/`, `/integrations/<id>/`; Chinese ones at `/zh/`, `/zh/apps/`, `/zh/integrations/<id>/`. Next exports both under `build/en` and `build/zh`, and `scripts/move-default-locale.mjs` (`postbuild`) moves `build/en` to the root of `build/`. `next dev` maps the same addresses with rewrites.
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
| `INTEGRATIONS_DIR` | (clone the dist branch) | Local `dist/` of casdoor-integrations |

The same build is served at marketplace.casdoor.com and marketplace.casdoor.cn. Canonical links, hreflang, structured data and the sitemap put English pages on the .com host and Chinese pages on the .cn host (`siteUrls` in `src/lib/i18n.ts`).
