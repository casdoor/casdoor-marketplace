"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type User = { owner: string; name: string; displayName: string; avatar: string; isAdmin: boolean };

type Account = { user: User | null; hasCasdoor: boolean; hasDatabase: boolean };

type Settings = { googleAnalyticsId: string; baiduTongjiId: string };

type Response<T> = { status: "ok" | "error"; msg: string; data: T };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
  const json = (await res.json()) as Response<T>;
  if (json.status !== "ok") {
    throw new Error(json.msg);
  }
  return json.data;
}

const fields: { key: keyof Settings; label: string; placeholder: string; help: string }[] = [
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
];

// The admin console: sign in with Casdoor, then set the analytics the backend puts into every page.
export function AdminConsole() {
  const [account, setAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/casdoor-logo_1185x256.png" alt="Casdoor" className="h-7 w-auto" />
          <span className="text-sm font-medium text-muted-foreground">Marketplace admin</span>
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-sm">
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
            <p className="text-sm text-muted-foreground">The admin console is for admins of the site&apos;s Casdoor organization.</p>
            {/* the backend redirects to Casdoor, so this is a full page load */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/signin" className={buttonVariants()}>
              Sign in with Casdoor
            </a>
          </div>
        )}

        {user && !user.isAdmin && (
          <p className="text-sm text-muted-foreground">
            {user.owner}/{user.name} is not an admin of this site. Sign out and sign in with an admin account.
          </p>
        )}

        {user?.isAdmin && !account?.hasDatabase && (
          <p className="text-sm leading-6 text-muted-foreground">
            The site has no database, so settings cannot be saved. Set <code>dataSourceName</code> in <code>conf/app.conf</code>{" "}
            and restart the site.
          </p>
        )}

        {user?.isAdmin && account?.hasDatabase && settings && (
          <form onSubmit={save} className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-semibold">Analytics</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The site reports to these on every public page. Leave a field empty to turn it off.
              </p>
            </div>
            {fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{f.label}</span>
                <Input
                  value={settings[f.key]}
                  placeholder={f.placeholder}
                  spellCheck={false}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                />
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
