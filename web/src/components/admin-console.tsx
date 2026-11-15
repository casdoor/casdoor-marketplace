"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminStats } from "@/components/admin-stats";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type User = { owner: string; name: string; displayName: string; avatar: string; isAdmin: boolean };

type Account = { user: User | null; hasCasdoor: boolean; hasDatabase: boolean };

type Settings = { googleAnalyticsId: string; baiduTongjiId: string; casdeskWidgets: string };

type Response<T> = { status: "ok" | "error"; msg: string; data: T };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
  const json = (await res.json()) as Response<T>;
  if (json.status !== "ok") {
    throw new Error(json.msg);
  }
  return json.data;
}

const fields: { key: keyof Settings; label: string; placeholder: string; help: string; multiline?: boolean }[] = [
  {
    key: "googleAnalyticsId",
    label: "Google Analytics measurement ID",
    placeholder: "G-XXXXXXXXXX",
    help: "Admin > Data streams > the web stream of the site in Google Analytics.",
  },
  {
    key: "baiduTongjiId",
    label: "Baidu Tongji site code",
    placeholder: "32 hexadecimal characters",
    help: "The part after hm.js? in the code Baidu Tongji gives for the site.",
  },
  {
    key: "casdeskWidgets",
    label: "Casdesk chat",
    placeholder: "marketplace.example.com https://chat.example.com example",
    help: "One line per domain: the domain of the pages (or * for any other), the Casdesk server and the Casdesk site.",
    multiline: true,
  },
];

// The admin console: sign in with Casdoor, then see what people do with the Marketplace and set the analytics the
// backend puts into every page.
export function AdminConsole() {
  const [account, setAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<"dashboard" | "statistics" | "settings">("dashboard");

  useEffect(() => {
    api<Account>("/api/get-account")
      .then((a) => {
        setAccount(a);
        if (a.user?.isAdmin) {
          return api<Settings>("/api/get-settings").then(setSettings);
        }
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setSettings(await api<Settings>("/api/update-settings", settings));
      setMessage("Saved. Pages pick up the change within a minute.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function signout() {
    await api("/api/signout", {});
    window.location.reload();
  }

  const user = account?.user;

  return (
    <div className={`mx-auto flex flex-col gap-6 px-4 py-12 ${user?.isAdmin && account?.hasDatabase ? "max-w-7xl" : "max-w-2xl"}`}>
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/casdoor-logo_1185x256.png" alt="Casdoor" className="h-7 w-auto" />
          <span className="text-sm font-medium text-muted-foreground">Marketplace admin</span>
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            {user.isAdmin && account?.hasDatabase && (
              <nav className="mr-2 flex gap-1">
                {(["dashboard", "statistics", "settings"] as const).map((p) => (
                  <Button key={p} variant={page === p ? "secondary" : "ghost"} size="sm" onClick={() => setPage(p)}>
                    {p === "dashboard" ? "Dashboard" : p === "statistics" ? "Statistics" : "Settings"}
                  </Button>
                ))}
              </nav>
            )}
            <span className="text-muted-foreground">
              {user.displayName} ({user.owner}/{user.name})
            </span>
            <Button variant="outline" size="sm" onClick={signout}>
              Sign out
            </Button>
          </div>
        )}
      </header>

      <main className="rounded-xl border bg-card p-6">
        {!account && !error && <p className="text-sm text-muted-foreground">Loading...</p>}

        {account && !account.hasCasdoor && (
          <p className="text-sm leading-6 text-muted-foreground">
            Signing in is not set up. Set <code>casdoorEndpoint</code>, <code>clientId</code> and <code>clientSecret</code> in{" "}
            <code>conf/app.conf</code> and restart the site.
          </p>
        )}

        {account?.hasCasdoor && !user && (
          <div className="flex flex-col items-start gap-4">
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">The admin console is for the site&apos;s admin account.</p>
            {/* the backend redirects to Casdoor, so this is a full page load */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/signin?redirect=%2Fadmin%2F" className={buttonVariants()}>
              Sign in with Casdoor
            </a>
          </div>
        )}

        {user && !user.isAdmin && (
          <p className="text-sm text-muted-foreground">
            {user.owner}/{user.name} is not the admin of this site. Sign out and sign in with the admin account.
          </p>
        )}

        {user?.isAdmin && !account?.hasDatabase && (
          <p className="text-sm leading-6 text-muted-foreground">
            The site has no database, so settings cannot be saved. Set <code>dataSourceName</code> in <code>conf/app.conf</code>{" "}
            and restart the site.
          </p>
        )}

        {user?.isAdmin && account?.hasDatabase && page === "dashboard" && <AdminDashboard />}

        {user?.isAdmin && account?.hasDatabase && page === "statistics" && <AdminStats />}

        {user?.isAdmin && account?.hasDatabase && page === "settings" && settings && (
          <form onSubmit={save} className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-semibold">Analytics and chat</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The site puts these on every public page. Leave a field empty to turn it off.
              </p>
            </div>
            {fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{f.label}</span>
                {f.multiline ? (
                  <textarea
                    value={settings[f.key] ?? ""}
                    placeholder={f.placeholder}
                    spellCheck={false}
                    rows={3}
                    className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    value={settings[f.key] ?? ""}
                    placeholder={f.placeholder}
                    spellCheck={false}
                    onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  />
                )}
                <span className="text-xs text-muted-foreground">{f.help}</span>
              </label>
            ))}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              {message && <span className="text-sm text-muted-foreground">{message}</span>}
            </div>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </main>
    </div>
  );
}
