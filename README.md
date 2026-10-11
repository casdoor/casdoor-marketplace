<div align="center">
  <a href="https://marketplace.casdoor.com">
    <img src="https://cdn.casbin.org/img/casdoor-logo_1185x256.png" alt="Casdoor" width="400">
  </a>

  <h3>Casdoor Marketplace</h3>

  <p>
    App integrations, identity provider templates and sign-in themes for <a href="https://github.com/casdoor/casdoor">Casdoor</a>,<br>
    each with a step-by-step guide and a one-click install from the Casdoor admin console.
  </p>

  <p>
    <a href="https://marketplace.casdoor.com"><strong>Marketplace</strong></a> &middot;
    <a href="https://github.com/casdoor/casdoor-integrations"><strong>Integrations</strong></a> &middot;
    <a href="https://casdoor.ai/docs/overview"><strong>Casdoor docs</strong></a> &middot;
    <a href="https://www.casdoor.com/?utm_source=github&amp;utm_medium=readme&amp;utm_content=marketplace"><strong>Casdoor Cloud</strong></a> &middot;
    <a href="https://discord.gg/5rPsrAzK7S"><strong>Discord</strong></a>
  </p>

  <p>
    <a href="https://marketplace.casdoor.com">
      <img src="https://img.shields.io/website?url=https%3A%2F%2Fmarketplace.casdoor.com&style=flat-square&label=marketplace.casdoor.com" alt="Website">
    </a>
    <a href="https://github.com/casdoor/casdoor-integrations">
      <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fcasdoor%2Fcasdoor-integrations%2Fdist%2Findex.json&query=%24.integrations.length&label=integrations&style=flat-square&color=blue" alt="Integrations">
    </a>
    <a href="go.mod">
      <img src="https://img.shields.io/github/go-mod/go-version/casdoor/casdoor-marketplace?style=flat-square&logo=go&logoColor=white" alt="Go version">
    </a>
    <a href="web/package.json">
      <img src="https://img.shields.io/github/package-json/dependency-version/casdoor/casdoor-marketplace/next?filename=web%2Fpackage.json&style=flat-square&logo=nextdotjs&label=Next.js" alt="Next.js version">
    </a>
    <a href="https://github.com/casdoor/casdoor-marketplace/commits/master">
      <img src="https://img.shields.io/github/last-commit/casdoor/casdoor-marketplace?style=flat-square" alt="Last commit">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/casdoor/casdoor-marketplace?style=flat-square" alt="License">
    </a>
    <a href="https://discord.gg/5rPsrAzK7S">
      <img src="https://img.shields.io/discord/1022748306096537660?style=flat-square&logo=discord&label=Discord&color=5865F2" alt="Discord">
    </a>
  </p>
</div>

## What's in the Marketplace

| Type | What it does | Examples |
|---|---|---|
| [App integrations](https://marketplace.casdoor.com/apps/) | Single sign-on for an app you run: the Casdoor application to create and the settings on the app's side, down to group and role mapping | Grafana, GitLab, Nextcloud, Vaultwarden, Argo CD |
| [Identity providers](https://marketplace.casdoor.com/providers/) | Ready-made provider templates for signing in to Casdoor with another identity system | Keycloak, authentik, ZITADEL, Authelia, GitLab Self-Managed |
| [Sign-in themes](https://marketplace.casdoor.com/themes/) | Login page designs that can be previewed and imported into an application | Material, Aurora, Terminal, Pixel, Backdrop, Sketch |

Actions (code that runs at sign-in, sign-up and token issuance) are planned.

Every integration has a page with its full guide at `https://marketplace.casdoor.com/integrations/<id>/`. The Casdoor admin console also has a **Marketplace** page that browses the same catalog and installs an integration in one step: it creates the application, provider or theme with your values filled in, and uninstalling removes it again.

## How it works

```
                    this repository                                         Casdoor instances
  MySQL  <-->  Go backend (:18300)  --/data/-->  index.json, bundles  -->  Marketplace page
  integrations,  /api/, /data/, admin    proxies pages to                   (marketplaceUrl, or the
  versions,      console               Next.js server (:18301)              dist branch on jsDelivr)
  files
```

- The catalog lives in MySQL: integrations, their versions and the files of every version (bundle, logo, screenshots). The backend serves it under `/data/` in the layout of the casdoor-integrations build: `/data/index.json` and `/data/integrations/<id>/<version>/<file>`.
- The pages are rendered by a Next.js server for every request, from `/data/`. The Go backend starts it (`web/build/standalone/server.js`, on the next port) and proxies every page to it; it answers `/api/` and `/data/` itself, and redirects between the languages.
- [casdoor-integrations](https://github.com/casdoor/casdoor-integrations) holds the official integrations. `tools/import_integrations` copies its build into the database: `go run ./tools/import_integrations -dir ../casdoor-integrations/dist` shows what it would add, `-apply` writes it. Published versions do not change.
- Casdoor instances do not depend on this site being up: they read the catalog from `https://cdn.jsdelivr.net/gh/casdoor/casdoor-integrations@dist` by default (`marketplaceUrl` in their `conf/app.conf` points them to a mirror, such as this site's `/data`).

## Repository layout

| Path | Contents |
|---|---|
| `main.go`, `routers/`, `controllers/`, `object/`, `conf/`, `util/` | Go (Beego) backend: serves `web/build`, language redirects, the admin console's API under `/api/`, and puts the analytics set in the admin console into the pages |
| `conf/app.conf` | Port (`httpport`, default 18300), MySQL (`dataSourceName`, `dbName`) and the Casdoor application of the admin console |
| `web/` | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui frontend, see [web/README.md](web/README.md) |

## Run locally

Requirements: Go 1.23+, Node.js 20+, MySQL.

Set `dataSourceName` in `conf/app.conf`, import the catalog (from a local build of casdoor-integrations, or a clone of its `dist` branch), build the frontend and run the backend:

```bash
go run ./tools/import_integrations -dir ../casdoor-integrations/dist -apply
cd web && npm install && npm run build && cd ..
go run main.go
```

The site is then at http://localhost:18300/ (English) and http://localhost:18300/zh/ (Chinese).

For frontend work with hot reload, run the backend and `npm run dev` in `web/` (http://localhost:3000/, which sends `/api/` and `/data/` to the backend). Without `dataSourceName` the backend serves `/data/` from `web/public/data`, which `npm run dev` fills from casdoor-integrations (`INTEGRATIONS_DIR=../../casdoor-integrations/dist npm run dev` for a local build).

## Admin console

`/admin/` is the admin console. People sign in with Casdoor; the user named `admin` of the Casdoor application's organization runs the site and can change its settings, which are kept in MySQL:

- **Analytics**: a Google Analytics measurement ID and a Baidu Tongji site code. The backend puts their scripts into every public page it serves. Nothing is preset, so a new deployment reports to no analytics until its admins set them.

To turn it on, set in `conf/app.conf` (or as environment variables of the same names):

| Item | Purpose |
|---|---|
| `dataSourceName`, `dbName` | MySQL, e.g. `root:123456@tcp(localhost:3306)/` and `casdoor_marketplace`. The tables are created on start |
| `casdoorEndpoint`, `clientId`, `clientSecret` | The Casdoor application to sign in with. Add `https://<host>/api/callback` to its redirect URLs for every host the site is served at |
| `casdoorOrganization` | Only users of this organization may sign in; its user named `admin` runs the site |

Without `dataSourceName` the site still serves every page, only without the admin console and settings.

## Contributing

- **Add or improve an integration**: open a pull request in [casdoor-integrations](https://github.com/casdoor/casdoor-integrations). Its README describes the manifest and the files for each type.
- **Request an integration**: [open an issue](https://github.com/casdoor/casdoor-integrations/issues/new) with the app or identity provider you need.
- **Improve the website**: open an issue or a pull request in this repository.

## License

[Apache-2.0](LICENSE)
