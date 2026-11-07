import Link from "next/link";
import { BookOpen, ChevronDown, Plus } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { getMessages, localePath, translateProviderCategory, type Locale } from "@/lib/i18n";
import { getIntegrations } from "@/lib/integrations";
import { countProviderCategories } from "@/lib/provider-categories";
import { collections, docsUrl, links } from "@/lib/site";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

export { GitHubIcon };

export async function SiteHeader({ lang }: { lang: Locale }) {
  const m = getMessages(lang);
  // the Casdoor categories that have providers, each a page of its own under Providers; without the catalog, such as on
  // pages that do not need it while the backend is down, Providers is a plain link
  const providerCategories = await getIntegrations(lang)
    .then((integrations) => countProviderCategories(integrations.filter((i) => i.type === "provider" || i.type === "action")))
    .catch(() => []);
  const linkClass = "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href={localePath(lang, "/")} className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/casdoor-logo_1185x256.png" alt="Casdoor" className="h-7 w-auto" />
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-semibold tracking-wide text-accent-foreground uppercase">
            {m.header.badge}
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {collections.map((c) =>
            c.type === "provider" && providerCategories.length > 0 ? (
              <div key={c.slug} className="group relative">
                <Link href={localePath(lang, `/${c.slug}/`)} className={`flex items-center gap-1 ${linkClass}`}>
                  {m.collections[c.type].title}
                  <ChevronDown className="size-3.5 transition-transform group-focus-within:rotate-180 group-hover:rotate-180" />
                </Link>
                <div className="invisible absolute top-full left-0 pt-1 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="flex min-w-48 flex-col rounded-lg border bg-popover p-1 shadow-lg">
                    {providerCategories.map(({ category, count }) => (
                      <Link
                        key={category.slug}
                        href={localePath(lang, `/${c.slug}/${category.slug}/`)}
                        className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-popover-foreground hover:bg-muted"
                      >
                        {m.providerCollection.title(translateProviderCategory(category.name, lang))}
                        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={c.slug} href={localePath(lang, `/${c.slug}/`)} className={linkClass}>
                {m.collections[c.type].title}
              </Link>
            )
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher lang={lang} />
          <a
            href={docsUrl(lang, "overview")}
            className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          >
            <BookOpen className="size-4" />
            {m.header.docs}
          </a>
          <a
            href={links.integrations}
            aria-label="GitHub"
            className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
          >
            <GitHubIcon className="size-5" />
          </a>
          <a href={links.contribute} className={buttonVariants({ size: "sm", className: "ml-2 hidden sm:inline-flex" })}>
            <Plus />
            {m.header.submit}
          </a>
          <AccountMenu lang={lang} />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1.5 text-sm md:hidden">
        {collections.map((c) => (
          <Link
            key={c.slug}
            href={localePath(lang, `/${c.slug}/`)}
            className="shrink-0 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted"
          >
            {m.collections[c.type].title}
          </Link>
        ))}
      </nav>
    </header>
  );
}
