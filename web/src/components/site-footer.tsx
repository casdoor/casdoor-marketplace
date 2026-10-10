import Link from "next/link";
import { collections, links } from "@/lib/site";

const columns = [
  {
    title: "Marketplace",
    items: collections.map((c) => ({ label: c.title, href: `/${c.slug}`, internal: true })),
  },
  {
    title: "Contribute",
    items: [
      { label: "Submit an integration", href: links.contribute },
      { label: "Request an integration", href: links.request },
      { label: "Integrations on GitHub", href: links.integrations },
      { label: "Marketplace on GitHub", href: links.github },
    ],
  },
  {
    title: "Casdoor",
    items: [
      { label: "Documentation", href: links.docs },
      { label: "Casdoor on GitHub", href: links.casdoor },
      { label: "Self-host with Docker", href: links.selfHost },
      { label: "Casdoor Cloud", href: links.cloud },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/casdoor-logo_1185x256.png" alt="Casdoor" className="h-7 w-fit" />
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            Integrations for Casdoor, the open-source identity and access management platform. Open source and reviewed by
            the Casdoor team.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3 text-sm">
            <h3 className="font-semibold">{col.title}</h3>
            <ul className="flex flex-col gap-2 text-muted-foreground">
              {col.items.map((item) => (
                <li key={item.label}>
                  {"internal" in item ? (
                    <Link href={item.href} className="hover:text-foreground">
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} className="hover:text-foreground">
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          Product names and logos belong to their owners. Settings of other products come from their own documentation,
          linked on each page.
        </p>
      </div>
    </footer>
  );
}
