import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { collections, links } from "@/lib/site";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

export { GitHubIcon };

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/casdoor-logo_1185x256.png" alt="Casdoor" className="h-7 w-auto" />
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-semibold tracking-wide text-accent-foreground uppercase">
            Marketplace
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {collections.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {c.title}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <a
            href={links.docs}
            className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          >
            <BookOpen className="size-4" />
            Docs
          </a>
          <a
            href={links.integrations}
            aria-label="GitHub"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <GitHubIcon className="size-5" />
          </a>
          <a href={links.contribute} className={buttonVariants({ size: "sm", className: "ml-2" })}>
            <Plus />
            Submit
          </a>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1.5 text-sm md:hidden">
        {collections.map((c) => (
          <Link key={c.slug} href={`/${c.slug}`} className="shrink-0 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted">
            {c.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}
