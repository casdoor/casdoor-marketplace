"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Totals = {
  visitors: number;
  pageViews: number;
  searches: number;
  clicks: number;
  casdoors: number;
  catalogFetches: number;
  browses: number;
  views: number;
  installs: number;
  installed: number;
  installFailed: number;
  uninstalled: number;
  paidDownloads: number;
};

type Point = Totals & { bucket: string };
type FunnelStep = { key: string; count: number };
type GroupStat = { name: string; integrations: number; pageViews: number; installs: number; installed: number; cdnHits: number };
type NameCount = { name: string; count: number };
type HeatCell = { weekday: number; hour: number; count: number };

type TopIntegration = {
  integrationId: string;
  name: string;
  type: string;
  edition: string;
  pageViews: number;
  installs: number;
  installAddresses: number;
  installed: number;
  installFailed: number;
  uninstalled: number;
  cdnHits: number;
};

type RecentEvent = {
  id: number;
  createdTime: string;
  action: string;
  integrationId: string;
  version: string;
  target: string;
  clientIp: string;
  licenseId: string;
  edition: string;
};

type Dashboard = {
  days: number;
  bucket: "hour" | "day";
  since: string;
  now: string;
  previousSince: string;
  previousUntil: string;
  totals: Totals;
  previous: Totals;
  series: Point[];
  siteFunnel: FunnelStep[];
  casdoorFunnel: FunnelStep[];
  types: GroupStat[];
  editions: GroupStat[];
  top: TopIntegration[];
  hosts: NameCount[];
  langs: NameCount[];
  referrers: NameCount[];
  searches: NameCount[];
  emptySearches: NameCount[];
  failStages: NameCount[];
  heatmap: HeatCell[];
  recent: RecentEvent[];
  catalog: { integrations: number; paid: number; published: number; revoked: number; pending: number; lastPublished: string };
  cdn: { period: string; bundleHits: Record<string, number> | null; indexHits: number; error: string };
};

type Response<T> = { status: "ok" | "error"; msg: string; data: T };

// the chart colors: categorical slots in a fixed order, and the status color for failures
const color = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  violet: "#6250d6",
  critical: "#d03b3b",
  good: "#0ca30c",
  grid: "#e7e6e2",
  axis: "#8a8984",
};

const heatRamp = ["#f3f7fd", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

const fmt = (n: number) => n.toLocaleString("en-US");

function pct(part: number, whole: number) {
  if (!whole) {
    return "-";
  }
  const p = (part / whole) * 100;
  return `${p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%`;
}

function successRate(t: { installed: number; installFailed: number }) {
  return t.installed + t.installFailed ? t.installed / (t.installed + t.installFailed) : NaN;
}

function bucketLabel(bucket: string, kind: "hour" | "day") {
  return kind === "hour" ? `${bucket.slice(11, 13)}:00` : bucket.slice(5, 10);
}

const ranges: { days: number; label: string }[] = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function Card({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {note && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Delta({ now, before, inverse }: { now: number; before: number; inverse?: boolean }) {
  if (!before && !now) {
    return <span className="shrink-0 whitespace-nowrap text-muted-foreground">no change</span>;
  }
  if (!before) {
    return <span className="shrink-0 whitespace-nowrap text-muted-foreground">new</span>;
  }
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) {
    return <span className="shrink-0 whitespace-nowrap text-muted-foreground">no change</span>;
  }
  const up = change > 0;
  const good = inverse ? !up : up;
  return (
    <span style={{ color: good ? color.good : color.critical }} className="shrink-0 font-medium whitespace-nowrap">
      {up ? "▲" : "▼"} {Math.abs(change * 100) >= 10 ? Math.abs(change * 100).toFixed(0) : Math.abs(change * 100).toFixed(1)}%
    </span>
  );
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 28;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(2)},${(h - 2 - (v / max) * (h - 4)).toFixed(2)}`).join("");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({
  label,
  value,
  hint,
  delta,
  spark,
  stroke = color.blue,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  delta?: React.ReactNode;
  spark?: number[];
  stroke?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="flex min-h-4 items-center justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-muted-foreground" title={typeof hint === "string" ? hint : undefined}>
          {hint}
        </span>
        {delta}
      </div>
      {spark && <Sparkline values={spark} stroke={stroke} />}
    </div>
  );
}

type Series = { key: keyof Totals; label: string; color: string; dashed?: boolean };

// A line chart of a few series on one count axis, with a crosshair and a tooltip of every series at the hovered bucket
function LineChart({ points, series, kind }: { points: Point[]; series: Series[]; kind: "hour" | "day" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [w, setW] = useState(600);
  const h = 220;

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const pad = { left: 36, right: 12, top: 10, bottom: 24 };
  const max = Math.max(1, ...points.flatMap((p) => series.map((s) => p[s.key])));
  const niceMax = (() => {
    const mag = 10 ** Math.floor(Math.log10(max));
    const n = max / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  })();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f)).filter((v, i, a) => a.indexOf(v) === i);
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 56))));

  function onMove(e: React.MouseEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || points.length === 0) {
      return;
    }
    const sx = ((e.clientX - box.left) / box.width) * w;
    const i = Math.round(((sx - pad.left) / innerW) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  }

  const hp = hover === null ? null : points[hover];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden>
              <line x1="0" y1="4" x2="16" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
      <div ref={ref} className="relative overflow-hidden" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block" role="img" aria-label={series.map((s) => s.label).join(", ")}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} stroke={color.grid} strokeWidth={1} />
              <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={color.axis}>
                {fmt(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            (i % labelEvery === 0 && x(points.length - 1) - x(i) >= 48) || i === points.length - 1 ? (
              <text
                key={p.bucket}
                x={x(i)}
                y={h - 6}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fontSize="11"
                fill={color.axis}
              >
                {bucketLabel(p.bucket, kind)}
              </text>
            ) : null,
          )}
          {series.map((s) => (
            <path
              key={s.key}
              d={points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`).join("")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "5 4" : undefined}
            />
          ))}
          {hp && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke={color.axis} strokeWidth={1} strokeDasharray="2 2" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(hp[s.key])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hp && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-md border bg-background px-3 py-2 text-xs shadow-sm"
            style={x(hover) / w > 0.6 ? { right: `${(1 - x(hover) / w) * 100 + 2}%` } : { left: `${(x(hover) / w) * 100 + 2}%` }}
          >
            <div className="mb-1 font-medium whitespace-nowrap">
              {kind === "hour" ? `${hp.bucket.slice(0, 10)} ${bucketLabel(hp.bucket, kind)}` : hp.bucket}
              {hover === points.length - 1 && <span className="font-normal text-muted-foreground"> (so far)</span>}
            </div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums">{fmt(hp[s.key])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; count: number }[] }) {
  const top = steps[0]?.count ?? 0;
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span>{s.label}</span>
            <span className="tabular-nums">
              <span className="font-medium">{fmt(s.count)}</span>
              {i > 0 && (
                <span className="ml-2 text-muted-foreground" title="Of the step before">
                  {pct(s.count, steps[i - 1].count)} of previous
                </span>
              )}
            </span>
          </div>
          <div className="h-3 rounded bg-muted/60">
            <div className="h-3 rounded" style={{ width: `${top ? Math.max((s.count / top) * 100, s.count ? 1 : 0) : 0}%`, background: color.blue }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarList({ rows, empty, barColor = color.blue, format }: { rows: NameCount[]; empty: string; barColor?: string; format?: (name: string) => string }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...rows.map((r) => r.count));
  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] items-center gap-2 text-xs" title={`${r.name}: ${fmt(r.count)} (${pct(r.count, total)})`}>
          <span className="truncate">{format ? format(r.name) : r.name || "(none)"}</span>
          <div className="h-2 rounded bg-muted/60">
            <div className="h-2 rounded" style={{ width: `${(r.count / max) * 100}%`, minWidth: 2, background: barColor }} />
          </div>
          <span className="min-w-8 text-right tabular-nums text-muted-foreground">{fmt(r.count)}</span>
        </div>
      ))}
    </div>
  );
}

function GroupBars({ rows }: { rows: GroupStat[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Nothing yet.</p>;
  }
  const metrics: { key: keyof GroupStat; label: string; color: string }[] = [
    { key: "installs", label: "Installs", color: color.orange },
    { key: "pageViews", label: "Page views", color: color.blue },
    { key: "cdnHits", label: "jsDelivr", color: color.aqua },
  ];
  const max: Record<string, number> = {};
  for (const m of metrics) {
    max[m.key] = Math.max(1, ...rows.map((r) => r[m.key] as number));
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 pr-2 text-left font-medium" />
            <th className="px-2 py-1 text-right font-medium">Listed</th>
            {metrics.map((m) => (
              <th key={m.key} className="px-2 py-1 text-left font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: m.color }} />
                  {m.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t">
              <td className="py-1.5 pr-2 font-medium capitalize">{r.name}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(r.integrations)}</td>
              {metrics.map((m) => (
                <td key={m.key} className="w-1/4 px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded" style={{ width: `${((r[m.key] as number) / max[m.key]) * 100}%`, minWidth: (r[m.key] as number) ? 2 : 0, background: m.color }} />
                    <span className="tabular-nums text-muted-foreground">{fmt(r[m.key] as number)}</span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Heatmap({ cells }: { cells: HeatCell[] }) {
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const c of cells) {
      if (c.weekday >= 0 && c.weekday < 7 && c.hour >= 0 && c.hour < 24) {
        g[c.weekday][c.hour] += c.count;
      }
    }
    return g;
  }, [cells]);
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <div className="grid min-w-[380px] grid-cols-[2rem_repeat(24,minmax(0,1fr))] gap-[2px] text-[10px] text-muted-foreground">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? h : ""}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="pr-1 leading-4">{weekdays[d]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  className="h-4 rounded-[2px]"
                  title={`${weekdays[d]} ${h}:00-${h + 1}:00: ${fmt(v)} page views`}
                  style={{ background: v ? heatRamp[Math.min(heatRamp.length - 1, 1 + Math.floor((v / max) * (heatRamp.length - 1)))] : heatRamp[0] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        Fewer
        {heatRamp.map((c) => (
          <span key={c} className="h-2.5 w-4 rounded-[2px]" style={{ background: c }} />
        ))}
        More (max {fmt(max)})
      </div>
    </div>
  );
}

const actionLabels: Record<string, { label: string; color: string }> = {
  view: { label: "Viewed", color: color.violet },
  install: { label: "Install started", color: color.orange },
  installed: { label: "Installed", color: color.good },
  install_failed: { label: "Install failed", color: color.critical },
  uninstalled: { label: "Uninstalled", color: color.axis },
};

function RecentList({ events }: { events: RecentEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No Casdoor activity yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y text-xs">
      {events.map((e) => {
        const a = actionLabels[e.action] ?? { label: e.action, color: color.axis };
        return (
          <li key={e.id} className="flex items-center gap-3 py-1.5">
            <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{e.createdTime.slice(5, 16)}</span>
            <span className="flex w-28 shrink-0 items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: a.color }} />
              {a.label}
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{e.integrationId}</span>
              <span className="text-muted-foreground">
                {e.version ? ` ${e.version}` : ""}
                {e.action === "install_failed" && e.target ? ` (${e.target})` : ""}
              </span>
            </span>
            <span className="hidden shrink-0 tabular-nums text-muted-foreground sm:inline" title={e.licenseId ? `license ${e.licenseId}` : undefined}>
              {e.clientIp}
              {e.licenseId ? ", licensed" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const langNames: Record<string, string> = { en: "English", zh: "Chinese" };

const stageNames: Record<string, string> = {
  revoked: "Revoked by the Marketplace",
  download: "Download or checksum",
  variables: "Missing required values",
  create: "Creating objects in Casdoor",
  save: "Saving the integration",
  other: "Other",
};

// The admin dashboard: the headline numbers of a period against the one before, their trend, the funnels from a visit
// to an install, and what is used the most
export function AdminDashboard() {
  const [days, setDays] = useState(7);
  const [result, setResult] = useState<{ days: number; data?: Dashboard; error?: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetch(`/api/get-dashboard?days=${days}`)
      .then((res) => res.json() as Promise<Response<Dashboard>>)
      .then((json) => {
        if (json.status !== "ok") {
          throw new Error(json.msg);
        }
        setResult({ days, data: json.data });
      })
      .catch((e: Error) => setResult({ days, error: e.message }));
  }, [days, reload]);

  const d = result?.days === days ? (result.data ?? null) : null;
  const error = result?.days === days ? (result.error ?? "") : "";

  const spark = (key: keyof Totals) => d?.series.map((p) => p[key]) ?? [];
  const cdnBundles = d ? Object.values(d.cdn.bundleHits ?? {}).reduce((a, b) => a + b, 0) : 0;
  const rate = d ? successRate(d.totals) : NaN;
  const prevRate = d ? successRate(d.previous) : NaN;
  const compareText = d
    ? days === 1
      ? `vs. yesterday until ${d.previousUntil.slice(11, 16)}`
      : `vs. ${d.previousSince.slice(5, 10)} to ${d.previousUntil.slice(5, 10)}`
    : "";
  const failTotal = d?.failStages.reduce((a, r) => a + r.count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {d ? `${d.since.slice(0, 16)} to ${d.now.slice(0, 16)} (Beijing time), changes ${compareText}. Crawlers and scripts are left out.` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {ranges.map((r) => (
            <Button key={r.days} size="sm" variant={days === r.days ? "secondary" : "ghost"} onClick={() => setDays(r.days)}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="ml-1" onClick={() => setReload((n) => n + 1)} title="Load again">
            Refresh
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!d && !error && <p className="text-sm text-muted-foreground">Loading...</p>}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label="Visitors"
              value={fmt(d.totals.visitors)}
              hint={`${fmt(d.totals.pageViews)} page views`}
              delta={<Delta now={d.totals.visitors} before={d.previous.visitors} />}
              spark={spark("visitors")}
            />
            <Kpi
              label="Casdoor instances"
              value={fmt(d.totals.casdoors)}
              hint="addresses that reached /data"
              delta={<Delta now={d.totals.casdoors} before={d.previous.casdoors} />}
              spark={spark("casdoors")}
            />
            <Kpi
              label="Installs started"
              value={fmt(d.totals.installs)}
              hint={`${fmt(d.totals.installed)} installed`}
              delta={<Delta now={d.totals.installs} before={d.previous.installs} />}
              spark={spark("installs")}
              stroke={color.orange}
            />
            <Kpi
              label="Install success"
              value={Number.isNaN(rate) ? "-" : pct(d.totals.installed, d.totals.installed + d.totals.installFailed)}
              hint={`${fmt(d.totals.installFailed)} failed`}
              delta={
                Number.isNaN(rate) || Number.isNaN(prevRate) ? undefined : (
                  <span className="text-muted-foreground">
                    was {pct(d.previous.installed, d.previous.installed + d.previous.installFailed)}
                  </span>
                )
              }
              spark={spark("installed")}
              stroke={color.aqua}
            />
            <Kpi
              label="Uninstalls"
              value={fmt(d.totals.uninstalled)}
              delta={<Delta now={d.totals.uninstalled} before={d.previous.uninstalled} inverse />}
              spark={spark("uninstalled")}
              stroke={color.axis}
            />
            <Kpi
              label="Searches"
              value={fmt(d.totals.searches)}
              hint={`${fmt(d.totals.clicks)} clicks and copies`}
              delta={<Delta now={d.totals.searches} before={d.previous.searches} />}
              spark={spark("searches")}
            />
            <Kpi
              label="Paid downloads"
              value={fmt(d.totals.paidDownloads)}
              hint="files fetched with a license"
              delta={<Delta now={d.totals.paidDownloads} before={d.previous.paidDownloads} />}
              spark={spark("paidDownloads")}
              stroke={color.violet}
            />
            <Kpi
              label={`jsDelivr (past ${d.cdn.period})`}
              value={d.cdn.error ? "-" : fmt(cdnBundles)}
              hint={d.cdn.error ? "jsDelivr statistics unavailable" : `bundles, plus ${fmt(d.cdn.indexHits)} catalog reads`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="Site traffic" note={`People on marketplace.casdoor.com and .cn, by ${d.bucket}.`}>
              <LineChart
                points={d.series}
                kind={d.bucket}
                series={[
                  { key: "pageViews", label: "Page views", color: color.blue },
                  { key: "visitors", label: "Visitors", color: color.orange },
                ]}
              />
            </Card>
            <Card title="Casdoor activity" note={`What Casdoor instances asked this site for, by ${d.bucket}.`}>
              <LineChart
                points={d.series}
                kind={d.bucket}
                series={[
                  { key: "casdoors", label: "Instances", color: color.blue },
                  { key: "installs", label: "Installs started", color: color.orange },
                  { key: "installed", label: "Installed", color: color.aqua },
                  { key: "installFailed", label: "Failed", color: color.critical, dashed: true },
                ]}
              />
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="Site funnel" note="Visitors who opened an integration page, and who then clicked a setup or source link or copied a step.">
              <Funnel
                steps={[
                  { label: "Visited the site", count: d.siteFunnel[0]?.count ?? 0 },
                  { label: "Opened an integration", count: d.siteFunnel[1]?.count ?? 0 },
                  { label: "Clicked or copied on it", count: d.siteFunnel[2]?.count ?? 0 },
                ]}
              />
            </Card>
            <Card title="Casdoor funnel" note="Addresses of Casdoor instances at each step of their Marketplace page.">
              <Funnel
                steps={[
                  { label: "Reached the Marketplace", count: d.casdoorFunnel[0]?.count ?? 0 },
                  { label: "Started an install", count: d.casdoorFunnel[1]?.count ?? 0 },
                  { label: "Installed one", count: d.casdoorFunnel[2]?.count ?? 0 },
                ]}
              />
            </Card>
          </div>

          <Card title="Top integrations" note="By installs started, then page views. Success is installed out of installs that ended.">
            {d.top.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-2 text-left font-medium">Integration</th>
                      <th className="px-2 py-1 text-left font-medium">Installs</th>
                      <th className="px-2 py-1 text-right font-medium">By</th>
                      <th className="px-2 py-1 text-right font-medium">Success</th>
                      <th className="px-2 py-1 text-right font-medium">Uninstalls</th>
                      <th className="px-2 py-1 text-left font-medium">Page views</th>
                      <th className="px-2 py-1 text-right font-medium">jsDelivr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const maxInstalls = Math.max(1, ...d.top.map((t) => t.installs));
                      const maxViews = Math.max(1, ...d.top.map((t) => t.pageViews));
                      return d.top.map((t) => (
                        <tr key={t.integrationId} className="border-t">
                          <td className="py-1.5 pr-2">
                            <a href={`/integrations/${t.integrationId}/`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                              {t.name || t.integrationId}
                            </a>
                            <span className="ml-1.5 text-muted-foreground">
                              {t.type}
                              {t.edition ? `, ${t.edition}` : ""}
                            </span>
                          </td>
                          <td className="w-1/5 px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 rounded" style={{ width: `${(t.installs / maxInstalls) * 100}%`, minWidth: t.installs ? 2 : 0, background: color.orange }} />
                              <span className="tabular-nums">{t.installs ? fmt(t.installs) : ""}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{t.installAddresses ? fmt(t.installAddresses) : ""}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{Number.isNaN(successRate(t)) ? "" : pct(t.installed, t.installed + t.installFailed)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{t.uninstalled ? fmt(t.uninstalled) : ""}</td>
                          <td className="w-1/5 px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 rounded" style={{ width: `${(t.pageViews / maxViews) * 100}%`, minWidth: t.pageViews ? 2 : 0, background: color.blue }} />
                              <span className="tabular-nums">{t.pageViews ? fmt(t.pageViews) : ""}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{t.cdnHits ? fmt(t.cdnHits) : ""}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="By type">
              <GroupBars rows={d.types} />
            </Card>
            <Card title="By edition" note="Commercial and Enterprise integrations need a license of that edition.">
              <GroupBars rows={d.editions} />
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card title="Referrers" note="Other sites that sent visitors.">
              <BarList rows={d.referrers} empty="No referrers yet." />
            </Card>
            <Card title="Domains and languages">
              <BarList rows={d.hosts} empty="No page views yet." />
              <BarList rows={d.langs} empty="" barColor={color.orange} format={(n) => langNames[n] ?? (n || "(none)")} />
            </Card>
            <Card title="Searches">
              <BarList rows={d.searches} empty="No searches yet." />
            </Card>
            <Card title="Searches with no result" note="What people look for that the Marketplace does not have.">
              <BarList rows={d.emptySearches} empty="None." barColor={color.violet} />
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
            <Card title="When people visit" note="Page views by weekday and hour, Beijing time.">
              <Heatmap cells={d.heatmap} />
            </Card>
            <Card title="Failed installs" note={failTotal ? `${fmt(failTotal)} in this period, by the step that failed.` : undefined}>
              <BarList rows={d.failStages} empty="No failed installs." barColor={color.critical} format={(n) => stageNames[n] ?? n} />
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
            <Card title="Latest Casdoor activity" note="The newest installs, uninstalls and views, whatever the period.">
              <RecentList events={d.recent} />
            </Card>
            <Card title="Catalog">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Integrations</dt>
                  <dd className="text-lg font-semibold tabular-nums">{fmt(d.catalog.integrations)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="text-lg font-semibold tabular-nums">{fmt(d.catalog.paid)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Published versions</dt>
                  <dd className="text-lg font-semibold tabular-nums">{fmt(d.catalog.published)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Revoked / pending</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {fmt(d.catalog.revoked)} / {fmt(d.catalog.pending)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Last published</dt>
                  <dd className="tabular-nums">{d.catalog.lastPublished ? d.catalog.lastPublished.replace("T", " ").slice(0, 16) : "-"}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
