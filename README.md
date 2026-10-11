# casdoor-marketplace

The Casdoor Marketplace: a catalog of app integrations, provider templates, themes and actions for [Casdoor](https://github.com/casdoor/casdoor), built from [casdoor-integrations](https://github.com/casdoor/casdoor-integrations).

- `web/`: the site, a static Next.js export (see [web/README.md](web/README.md)).
- The Go (Beego) backend in this directory serves `web/build` and, later, the API under `/api/`.

## Run

```bash
cd web && npm install && npm run build && cd ..
go run main.go
```

The site is then at http://localhost:18300/ (English) and http://localhost:18300/zh/ (Chinese); `httpport` is in `conf/app.conf`.
