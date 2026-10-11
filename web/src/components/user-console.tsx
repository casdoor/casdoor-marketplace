"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, LogIn, PackageOpen, Settings } from "lucide-react";
import { UserAvatar } from "@/components/account-menu";
import { TypeIcon } from "@/components/type-icon";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { api, signinUrl, type Account } from "@/lib/account";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { links } from "@/lib/site";
import type { IntegrationType } from "@/lib/types";

type Version = { version: string; status: string; statusReason: string; publishedAt: string; createdTime: string };

type MyIntegration = {
  id: string;
  type: IntegrationType;
  name: string;
  logo: string;
  latest: string;
  updatedTime: string;
  versions: Version[];
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Published: "secondary",
  Pending: "outline",
  Rejected: "destructive",
  Revoked: "destructive",
};

function VersionStatus({ status, lang }: { status: string; lang: Locale }) {
  return <Badge variant={statusVariants[status] ?? "outline"}>{getMessages(lang).console.statuses[status] ?? status}</Badge>;
}

// The console every signed-in user has: their integrations with the versions and review status of each.
export function UserConsole({ lang }: { lang: Locale }) {
  const m = getMessages(lang);
  const c = m.console;
  const [account, setAccount] = useState<Account | null>(null);
  const [integrations, setIntegrations] = useState<MyIntegration[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Account>("/api/get-account")
      .then((a) => {
        setAccount(a);
        if (a.user) {
          return api<MyIntegration[]>("/api/get-my-integrations").then(setIntegrations);
        }
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const user = account?.user;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}

      {!account && !error && <p className="text-sm text-muted-foreground">{c.loading}</p>}

      {account && !account.hasCasdoor && <p className="text-sm text-muted-foreground">{c.unavailable}</p>}

      {account?.hasCasdoor && !user && (
        <section className="flex flex-col items-start gap-4 rounded-xl border bg-card p-8">
          <h2 className="text-xl font-semibold">{c.signinTitle}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{c.signinText}</p>
          {/* the backend redirects to Casdoor, so this is a full page load */}
          <a href={signinUrl(localePath(lang, "/console/"))} className={buttonVariants()}>
            <LogIn />
            {c.signin}
          </a>
        </section>
      )}

      {user && (
        <>
          <section className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
            <UserAvatar name={user.displayName || user.name} avatar={user.avatar} className="size-12 text-lg" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{user.displayName || user.name}</div>
              <div className="truncate text-sm text-muted-foreground">
                {c.signedInAs} {user.owner}/{user.name}
              </div>
            </div>
            {user.isAdmin && (
              <Link href="/admin/" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Settings />
                {m.header.settings}
              </Link>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">{c.myIntegrations}</h2>

            {!integrations && !error && <p className="text-sm text-muted-foreground">{c.loading}</p>}

            {integrations?.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
                <PackageOpen className="size-8 text-muted-foreground" />
                <div className="font-medium">{c.emptyTitle}</div>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground">{c.emptyText}</p>
                <a href={links.contribute} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {c.howToSubmit}
                  <ExternalLink />
                </a>
              </div>
            )}

            {integrations && integrations.length > 0 && (
              <ul className="divide-y rounded-xl border bg-card">
                {integrations.map((i) => {
                  // `latest` is the published version the catalog shows; newer ones may still be in review
                  const isListed = i.versions.some((v) => v.version === i.latest && v.status === "Published");
                  const rejected = i.versions.find((v) => v.status === "Rejected" && v.statusReason);
                  return (
                    <li key={i.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {i.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/data/${i.logo}`} alt="" className="size-10 shrink-0 object-contain p-1" />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <TypeIcon type={i.type} className="size-5" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium">{i.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {m.typeLabels[i.type] ?? i.type} | {i.id}
                          </div>
                          {rejected && (
                            <div className="mt-1 text-xs text-destructive">
                              {rejected.version}: {rejected.statusReason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        {i.versions.slice(0, 3).map((v) => (
                          <span key={v.version} className="flex items-center gap-1.5">
                            <span className="font-mono">{v.version}</span>
                            <VersionStatus status={v.status} lang={lang} />
                          </span>
                        ))}
                        {i.versions.length > 3 && (
                          <span className="text-muted-foreground">
                            {c.versions} {i.versions.length}
                          </span>
                        )}
                        {isListed && (
                          <Link
                            href={localePath(lang, `/integrations/${i.id}/`)}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            {c.view}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
