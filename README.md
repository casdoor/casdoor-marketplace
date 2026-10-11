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
| [Sign-in themes](https://marketplace.casdoor.com/themes/) | Login page designs that can be previewed and imported into an application | Midnight, Split |

Actions (code that runs at sign-in, sign-up and token issuance) are planned.

Every integration has a page with its full guide at `https://marketplace.casdoor.com/integrations/<id>/`. The Casdoor admin console also has a **Marketplace** page that browses the same catalog and installs an integration in one step: it creates the application, provider or theme with your values filled in, and uninstalling removes it again.

## How it works

```
casdoor/casdoor-integrations          this repository                      Casdoor instances
  integrations/<type>/<id>/   --CI-->   web/  (Next.js static export)  -->   Marketplace page
  dist branch: index.json,              Go backend serves web/build          reads index.json and
  bundles, logos, screenshots           at marketplace.casdoor.com           bundles from the CDN
```

- The content lives in [casdoor-integrations](https://github.com/casdoor/casdoor-integrations). Its CI validates every manifest and publishes `index.json` and the bundles to its `dist` branch.
- This repository is the website. At build time `web/scripts/fetch-integrations.mjs` copies the `dist` branch into `web/public/data`, and every integration, type page and guide is rendered to static HTML. The site also serves the data under `/data/`.
- Casdoor instances do not depend on this site being up: they read the catalog from `https://cdn.jsdelivr.net/gh/casdoor/casdoor-integrations@dist` by default (`marketplaceUrl` in `conf/app.conf` points them to a mirror).

## Repository layout

| Path | Contents |
|---|---|
| `main.go`, `routers/`, `util/` | Go (Beego) backend: serves `web/build`, language redirects, and later the API under `/api/` (accounts, submissions, review, signing) |
| `conf/app.conf` | Port (`httpport`, default 18300) |
| `web/` | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui frontend, see [web/README.md](web/README.md) |

## Run locally

Requirements: Go 1.23+, Node.js 20+.

```bash
cd web && npm install && npm run build && cd ..
go run main.go
```

The site is then at http://localhost:18300/ (English) and http://localhost:18300/zh/ (Chinese).

For frontend work with hot reload, run `npm run dev` in `web/`. To preview local changes to the catalog, build casdoor-integrations first and point the site at its output:

```bash
cd web
INTEGRATIONS_DIR=../../casdoor-integrations/dist npm run dev
```

## Contributing

- **Add or improve an integration**: open a pull request in [casdoor-integrations](https://github.com/casdoor/casdoor-integrations). Its README describes the manifest and the files for each type.
- **Request an integration**: [open an issue](https://github.com/casdoor/casdoor-integrations/issues/new) with the app or identity provider you need.
- **Improve the website**: open an issue or a pull request in this repository.

## License

[Apache-2.0](LICENSE)
