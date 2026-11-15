"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Response<T> = { status: "ok" | "error"; msg: string; data: T };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const json = (await res.json()) as Response<T>;
  if (json.status !== "ok") {
    throw new Error(json.msg);
  }
  return json.data;
}

type ActionCount = { source: string; action: string; count: number; visitors: number; addresses: number };
type DailyCount = { day: string; source: string; action: string; count: number };
type NameCount = { name: string; count: number };
type IntegrationStat = {
  integrationId: string;
  name: string;
  type: string;
  edition: string;
  pageViews: number;
  visitors: number;
  clicks: number;
  installs: number;
  installAddresses: number;
  installed: number;
  installFailed: number;
  uninstalled: number;
  downloads: number;
  downloadAddresses: number;
  cdnHits: number;
};
type Stats = {
  days: number;
  since: string;
  actions: ActionCount[] | null;
  daily: DailyCount[] | null;
  integrations: IntegrationStat[] | null;
  searches: NameCount[] | null;
  clicks: NameCount[] | null;
  referrers: NameCount[] | null;
  pages: NameCount[] | null;
  licenses: NameCount[] | null;
  failStages: NameCount[] | null;
  visitors: number;
  returningVisitors: number;
  cdn: { period: string; bundleHits: Record<string, number>; indexHits: number; error: string };
};

type Event = {
  id: number;
  createdTime: string;
  source: string;
  action: string;
  integrationId: string;
  version: string;
  integrationType: string;
  target: string;
  query: string;
  count: number;
  path: string;
  referrer: string;
  lang: string;
  host: string;
  visitorId: string;
  user: string;
  edition: string;
  licenseId: string;
  clientIp: string;
  userAgent: string;
  isBot: boolean;
};

type CatalogClient = {
  clientIp: string;
  userAgent: string;
  fetches: number;
  installs: number;
  installed: number;
  installFailed: number;
  uninstalled: number;
  downloads: number;
  days: number;
  firstSeen: string;
  lastSeen: string;
  licenseId: string;
  hosts: string;
};

const fmt = (n: number) => n.toLocaleString("en-US");

function sum(actions: ActionCount[], source: string, action: string, field: "count" | "visitors" | "addresses" = "count") {
  return actions.filter((a) => a.source === source && a.action === action).reduce((n, a) => n + a[field], 0);
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function NameCountTable({ rows, empty, link }: { rows: NameCount[] | null; empty: string; link?: (name: string) => string | null }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => {
          const href = link?.(r.name);
          return (
            <tr key={r.name} className="border-b last:border-0">
              <td className="max-w-0 truncate py-1.5 pr-3" title={r.name}>
                {href ? (
                  <a href={href} className="hover:underline" target="_blank" rel="noopener noreferrer">
                    {r.name || "(none)"}
                  </a>
                ) : (
                  r.name || "(none)"
                )}
              </td>
              <td className="w-1/3 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded bg-primary/60" style={{ width: `${(r.count / max) * 100}%`, minWidth: 2 }} />
                  <span className="tabular-nums text-muted-foreground">{fmt(r.count)}</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// the daily series shown, as source/action
const dailySeries: { key: string; label: string }[] = [
  { key: "site/page_view", label: "Page views" },
  { key: "site/search", label: "Searches" },
  { key: "site/click", label: "Clicks" },
  { key: "site/copy", label: "Copies" },
  { key: "site/filter", label: "Filters" },
  { key: "data/install", label: "Installs" },
  { key: "data/installed", label: "Installed" },
  { key: "data/install_failed", label: "Failed" },
  { key: "data/uninstalled", label: "Uninstalled" },
  { key: "data/download", label: "File downloads" },
  { key: "data/index", label: "Catalog fetches" },
];

function DailyTable({ daily, days, since }: { daily: DailyCount[]; days: number; since: string }) {
  const { rows, max } = useMemo(() => {
    const byDay: Record<string, Record<string, number>> = {};
    const start = new Date(`${since.slice(0, 10)}T00:00:00Z`);
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
      byDay[d] = {};
    }
    for (const c of daily) {
      if (byDay[c.day]) {
        byDay[c.day][`${c.source}/${c.action}`] = (byDay[c.day][`${c.source}/${c.action}`] ?? 0) + c.count;
      }
    }
    const rows = Object.entries(byDay).reverse();
    const max: Record<string, number> = {};
    for (const s of dailySeries) {
      max[s.key] = Math.max(1, ...rows.map(([, v]) => v[s.key] ?? 0));
    }
    return { rows, max };
  }, [daily, days, since]);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Day</th>
            {dailySeries.map((s) => (
              <th key={s.key} className="px-2 py-2 text-right font-medium whitespace-nowrap">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([day, v]) => (
            <tr key={day} className="border-t">
              <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{day}</td>
              {dailySeries.map((s) => {
                const n = v[s.key] ?? 0;
                return (
                  <td key={s.key} className="relative px-2 py-1.5 text-right tabular-nums">
                    <div className="absolute inset-y-1 right-0 rounded-l bg-primary/10" style={{ width: `${(n / max[s.key]) * 100}%` }} />
                    <span className="relative">{n ? fmt(n) : ""}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SortKey = keyof IntegrationStat;

const integrationColumns: { key: SortKey; label: string; title: string }[] = [
  { key: "installs", label: "Installs", title: "Installs started: Casdoor reads its meta.json from this site before installing a version" },
  { key: "installAddresses", label: "By", title: "The addresses that installed it" },
  { key: "installed", label: "Installed", title: "Installs that succeeded" },
  { key: "installFailed", label: "Failed", title: "Installs that failed after the meta.json check" },
  { key: "uninstalled", label: "Uninstalled", title: "Uninstalls of it" },
  { key: "pageViews", label: "Page views", title: "Views of its page on this site" },
  { key: "visitors", label: "Visitors", title: "Unique visitors of its page" },
  { key: "clicks", label: "Clicks", title: "Clicks and copies on its page" },
  { key: "downloads", label: "Downloads", title: "Its files downloaded from this site (/data), mostly by Casdoor backends" },
  { key: "downloadAddresses", label: "From", title: "The addresses that downloaded them" },
  { key: "cdnHits", label: "CDN", title: "bundle.json downloads from jsDelivr, where Casdoor gets the free integrations by default" },
];

function IntegrationTable({ rows, onPick }: { rows: IntegrationStat[]; onPick: (id: string) => void }) {
  const [sort, setSort] = useState<SortKey>("installs");
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = rows.filter((r) => !f || r.integrationId.includes(f) || r.name.toLowerCase().includes(f) || r.type === f);
    return [...list].sort((a, b) => (b[sort] as number) - (a[sort] as number) || a.integrationId.localeCompare(b.integrationId));
  }, [rows, sort, filter]);

  return (
    <div className="flex flex-col gap-2">
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by ID, name or type" className="max-w-xs" />
      <div className="max-h-[36rem] overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Integration</th>
              {integrationColumns.map((c) => (
                <th key={c.key} title={c.title} className="px-2 py-2 text-right font-medium whitespace-nowrap">
                  <button className={`hover:text-foreground ${sort === c.key ? "text-foreground underline" : ""}`} onClick={() => setSort(c.key)}>
                    {c.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.integrationId} className="border-t hover:bg-muted/40">
                <td className="px-3 py-1.5">
                  <button className="text-left hover:underline" onClick={() => onPick(r.integrationId)} title="Show its events">
                    <span className="font-medium">{r.integrationId}</span>
                    <span className="ml-1.5 text-muted-foreground">
                      {r.type}
                      {r.edition ? ` · ${r.edition}` : ""}
                    </span>
                  </button>
                </td>
                {integrationColumns.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 text-right tabular-nums">
                    {(r[c.key] as number) ? fmt(r[c.key] as number) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Overview({ onPick }: { onPick: (id: string) => void }) {
  const [days, setDays] = useState(30);
  // the answer for the days it was asked for, so switching shows Loading until the new one arrives
  const [result, setResult] = useState<{ days: number; stats?: Stats; error?: string } | null>(null);

  useEffect(() => {
    get<Stats>(`/api/get-event-stats?days=${days}`)
      .then((stats) => setResult({ days, stats }))
      .catch((e: Error) => setResult({ days, error: e.message }));
  }, [days]);

  const stats = result?.days === days ? (result.stats ?? null) : null;
  const error = result?.days === days ? (result.error ?? "") : "";

  const actions = stats?.actions ?? [];
  const cdnTotal = stats ? Object.values(stats.cdn.bundleHits ?? {}).reduce((a, b) => a + b, 0) : 0;
  const themeIds = new Set((stats?.integrations ?? []).filter((i) => i.type === "theme").map((i) => i.integrationId));
  const cdnNonTheme = stats
    ? Object.entries(stats.cdn.bundleHits ?? {})
        .filter(([id]) => !themeIds.has(id))
        .reduce((a, [, b]) => a + b, 0)
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
            Last {d} days
          </Button>
        ))}
        {stats && <span className="text-xs text-muted-foreground">since {stats.since} (China time), crawlers and scripts left out</span>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!stats && !error && <p className="text-sm text-muted-foreground">Loading...</p>}

      {stats && (
        <>
          <Section title="The site">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Page views" value={fmt(sum(actions, "site", "page_view"))} />
              <Tile label="Visitors" value={fmt(stats.visitors)} hint={`${fmt(stats.returningVisitors)} came on more than one day`} />
              <Tile label="Searches" value={fmt(sum(actions, "site", "search"))} />
              <Tile label="Filters" value={fmt(sum(actions, "site", "filter"))} />
              <Tile label="Clicks" value={fmt(sum(actions, "site", "click"))} />
              <Tile label="Copies" value={fmt(sum(actions, "site", "copy"))} hint="text copied from setup steps" />
              <Tile label="Sign-ins" value={fmt(sum(actions, "site", "signin"))} />
            </div>
          </Section>

          <Section
            title="Downloads"
            note="What Casdoor instances and others fetched from /data on this site. Casdoor reads an integration's meta.json here before installing it (an install), again when the install has ended (installed or failed) and when it is uninstalled, with only the integration, the version and the step in the address. It gets the free catalog and bundles from jsDelivr by default, so those mostly show in jsDelivr's public statistics."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Installs" value={fmt(sum(actions, "data", "install"))} hint={`from ${fmt(sum(actions, "data", "install", "addresses"))} addresses`} />
              <Tile label="Installed" value={fmt(sum(actions, "data", "installed"))} hint={`from ${fmt(sum(actions, "data", "installed", "addresses"))} addresses`} />
              <Tile label="Failed installs" value={fmt(sum(actions, "data", "install_failed"))} hint={`from ${fmt(sum(actions, "data", "install_failed", "addresses"))} addresses`} />
              <Tile label="Uninstalls" value={fmt(sum(actions, "data", "uninstalled"))} hint={`from ${fmt(sum(actions, "data", "uninstalled", "addresses"))} addresses`} />
              <Tile label="Catalog fetches" value={fmt(sum(actions, "data", "index"))} hint={`from ${fmt(sum(actions, "data", "index", "addresses"))} addresses`} />
              <Tile label="File downloads" value={fmt(sum(actions, "data", "download"))} hint={`from ${fmt(sum(actions, "data", "download", "addresses"))} addresses`} />
              <Tile label={`jsDelivr catalog (${stats.cdn.period})`} value={stats.cdn.error ? "—" : fmt(stats.cdn.indexHits)} hint={stats.cdn.error || undefined} />
              <Tile label={`jsDelivr bundles (${stats.cdn.period})`} value={stats.cdn.error ? "—" : fmt(cdnTotal)} hint={stats.cdn.error ? undefined : `${fmt(cdnNonTheme)} without themes`} />
            </div>
          </Section>

          <Section title="Day by day">
            <DailyTable daily={stats.daily ?? []} days={stats.days} since={stats.since} />
          </Section>

          <Section
            title="Integrations"
            note="Click a column to sort, an integration to see its events. Themes' CDN numbers are mostly the theme showcase of the demo sites, not installs."
          >
            <IntegrationTable rows={stats.integrations ?? []} onPick={onPick} />
          </Section>

          <div className="grid gap-8 lg:grid-cols-2">
            <Section title="Searches">
              <NameCountTable rows={stats.searches} empty="No searches yet." />
            </Section>
            <Section title="Clicks and copies">
              <NameCountTable rows={stats.clicks} empty="No clicks yet." />
            </Section>
            <Section title="Pages">
              <NameCountTable rows={stats.pages} empty="No page views yet." link={(name) => name} />
            </Section>
            <Section title="Referrers">
              <NameCountTable rows={stats.referrers} empty="No referrers yet." link={(name) => name} />
            </Section>
            <Section title="Paid downloads by license">
              <NameCountTable rows={stats.licenses} empty="No paid downloads yet." />
            </Section>
            <Section title="Failed installs" note="By integration, version and the stage it failed at: revoked, download (the bundle or its checksum), variables, create (the objects in Casdoor) or save.">
              <NameCountTable rows={stats.failStages} empty="No failed installs yet." />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

const sources = ["", "site", "data"];
const actionsBySource: Record<string, string[]> = {
  "": ["", "page_view", "search", "filter", "click", "copy", "signin", "install", "installed", "install_failed", "uninstalled", "index", "download"],
  site: ["", "page_view", "search", "filter", "click", "copy", "signin"],
  data: ["", "install", "installed", "install_failed", "uninstalled", "index", "download"],
};

export type EventQuery = { source: string; action: string; integrationId: string; clientIp: string; visitorId: string; includeBots: boolean };

export const emptyEventQuery: EventQuery = { source: "", action: "", integrationId: "", clientIp: "", visitorId: "", includeBots: false };

function describe(e: Event) {
  const parts = [e.integrationId && `${e.integrationId}${e.version ? ` ${e.version}` : ""}`, e.target, e.query && `“${e.query}” (${e.count})`, e.path];
  return parts.filter(Boolean).join(" · ");
}

function Events({ query, setQuery }: { query: EventQuery; setQuery: (q: EventQuery) => void }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data?: { events: Event[] | null; total: number }; error?: string } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const pageSize = 100;
  const key = JSON.stringify([query, page]);
  const data = result?.key === key ? (result.data ?? null) : null;
  const error = result?.key === key ? (result.error ?? "") : "";

  useEffect(() => {
    const params = new URLSearchParams({ p: String(page), pageSize: String(pageSize) });
    for (const key of ["source", "action", "integrationId", "clientIp", "visitorId"] as const) {
      if (query[key]) {
        params.set(key, query[key]);
      }
    }
    if (query.includeBots) {
      params.set("includeBots", "1");
    }
    const key = JSON.stringify([query, page]);
    get<{ events: Event[] | null; total: number }>(`/api/get-events?${params}`)
      .then((data) => setResult({ key, data }))
      .catch((e: Error) => setResult({ key, error: e.message }));
  }, [query, page]);

  const update = (q: Partial<EventQuery>) => {
    setPage(1);
    setQuery({ ...query, ...q });
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const select = "h-8 rounded-md border bg-background px-2 text-sm";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={select} value={query.source} onChange={(e) => update({ source: e.target.value, action: "" })}>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s || "All sources"}
            </option>
          ))}
        </select>
        <select className={select} value={query.action} onChange={(e) => update({ action: e.target.value })}>
          {actionsBySource[query.source].map((a) => (
            <option key={a} value={a}>
              {a || "All actions"}
            </option>
          ))}
        </select>
        <Input className="h-8 w-44" placeholder="Integration ID" value={query.integrationId} onChange={(e) => update({ integrationId: e.target.value.trim() })} />
        <Input className="h-8 w-40" placeholder="IP address" value={query.clientIp} onChange={(e) => update({ clientIp: e.target.value.trim() })} />
        <Input className="h-8 w-40" placeholder="Visitor ID" value={query.visitorId} onChange={(e) => update({ visitorId: e.target.value.trim() })} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={query.includeBots} onChange={(e) => update({ includeBots: e.target.checked })} />
          Crawlers and scripts
        </label>
        <Button size="sm" variant="ghost" onClick={() => update(emptyEventQuery)}>
          Clear
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="text-sm text-muted-foreground">Loading...</p>}

      {data && (
        <>
          <div className="text-xs text-muted-foreground">
            {fmt(data.total)} events, page {page} of {pages}. Click a row for its details, an ID to filter by it.
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-2 py-2 text-left font-medium">Event</th>
                  <th className="px-2 py-2 text-left font-medium">What</th>
                  <th className="px-2 py-2 text-left font-medium">Who</th>
                </tr>
              </thead>
              <tbody>
                {(data.events ?? []).map((e) => (
                  <Fragment key={e.id}>
                    <tr className="cursor-pointer border-t align-top hover:bg-muted/40" onClick={() => setOpen(open === e.id ? null : e.id)}>
                      <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{e.createdTime}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span className="text-muted-foreground">{e.source}/</span>
                        {e.action}
                        {e.isBot && <span className="ml-1 text-muted-foreground">bot</span>}
                      </td>
                      <td className="max-w-md px-2 py-1.5 break-all">{describe(e)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {e.visitorId ? (
                          <button
                            className="hover:underline"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              update({ visitorId: e.visitorId });
                            }}
                          >
                            {e.user || e.visitorId}
                          </button>
                        ) : (
                          e.user
                        )}
                        <button
                          className="ml-1.5 text-muted-foreground hover:underline"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            update({ clientIp: e.clientIp });
                          }}
                        >
                          {e.clientIp}
                        </button>
                        {e.licenseId && <span className="ml-1.5 text-muted-foreground">{e.licenseId}</span>}
                      </td>
                    </tr>
                    {open === e.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="px-3 py-2">
                          <pre className="text-[11px] leading-5 break-all whitespace-pre-wrap">
                            {JSON.stringify(
                              Object.fromEntries(Object.entries(e).filter(([, v]) => v !== "" && v !== 0 && v !== false)),
                              null,
                              2
                            )}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Newer
            </Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Older
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function CatalogClients({ onPick }: { onPick: (clientIp: string) => void }) {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<{ days: number; rows?: CatalogClient[]; error?: string } | null>(null);

  useEffect(() => {
    get<CatalogClient[] | null>(`/api/get-catalog-clients?days=${days}`)
      .then((rows) => setResult({ days, rows: rows ?? [] }))
      .catch((e: Error) => setResult({ days, error: e.message }));
  }, [days]);

  const rows = result?.days === days ? result.rows : undefined;
  const error = result?.days === days ? result.error : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
            Last {d} days
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">
          Addresses that fetched the catalog or files from /data on this site, mostly Casdoor backends (Go-http-client).
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows && !error && <p className="text-sm text-muted-foreground">Loading...</p>}
      {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing fetched from /data yet.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Address</th>
                <th className="px-2 py-2 text-left font-medium">Client</th>
                <th className="px-2 py-2 text-right font-medium">Catalog fetches</th>
                <th className="px-2 py-2 text-right font-medium">Installs</th>
                <th className="px-2 py-2 text-right font-medium">Installed</th>
                <th className="px-2 py-2 text-right font-medium">Failed</th>
                <th className="px-2 py-2 text-right font-medium">Uninstalled</th>
                <th className="px-2 py-2 text-right font-medium">Downloads</th>
                <th className="px-2 py-2 text-right font-medium">Days</th>
                <th className="px-2 py-2 text-left font-medium">First seen</th>
                <th className="px-2 py-2 text-left font-medium">Last seen</th>
                <th className="px-2 py-2 text-left font-medium">License</th>
                <th className="px-2 py-2 text-left font-medium">Site</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clientIp} className="border-t hover:bg-muted/40">
                  <td className="px-3 py-1.5 font-mono">
                    <button className="hover:underline" onClick={() => onPick(r.clientIp)} title="Show its events">
                      {r.clientIp}
                    </button>
                  </td>
                  <td className="max-w-48 truncate px-2 py-1.5" title={r.userAgent}>
                    {r.userAgent}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.fetches)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.installs ? fmt(r.installs) : ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.installed ? fmt(r.installed) : ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.installFailed ? fmt(r.installFailed) : ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.uninstalled ? fmt(r.uninstalled) : ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.downloads ? fmt(r.downloads) : ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.days}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{r.firstSeen}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{r.lastSeen}</td>
                  <td className="px-2 py-1.5">{r.licenseId}</td>
                  <td className="px-2 py-1.5">{r.hosts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Tab = "overview" | "events" | "clients";

// The statistics of the admin console: totals and daily numbers, every event, and the addresses that fetched /data
export function AdminStats() {
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState<EventQuery>(emptyEventQuery);

  const pickIntegration = (integrationId: string) => {
    setQuery({ ...emptyEventQuery, integrationId });
    setTab("events");
  };
  const pickClient = (clientIp: string) => {
    setQuery({ ...emptyEventQuery, clientIp });
    setTab("events");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 border-b">
        {(
          [
            ["overview", "Overview"],
            ["events", "Events"],
            ["clients", "Catalog clients"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview onPick={pickIntegration} />}
      {tab === "events" && <Events query={query} setQuery={setQuery} />}
      {tab === "clients" && <CatalogClients onPick={pickClient} />}
    </div>
  );
}
