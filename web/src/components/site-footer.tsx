import Link from "next/link";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { collections, docsUrl, links } from "@/lib/site";

export function SiteFooter({ lang }: { lang: Locale }) {
  const m = getMessages(lang);
  const f = m.footer;
  const columns = [
    {
      title: f.marketplace,
      items: collections.map((c) => ({ label: m.collections[c.type].title, href: localePath(lang, `/${c.slug}/`), internal: true })),
    },
    {
      title: f.contribute,
      items: [
        { label: f.submit, href: links.contribute },
        { label: f.request, href: links.request },
        { label: f.integrationsRepo, href: links.integrations },
        { label: f.marketplaceRepo, href: links.github },
      ],
    },
    {
      title: f.casdoor,
      items: [
        { label: f.docs, href: docsUrl(lang, "overview") },
        { label: f.casdoorRepo, href: links.casdoor },
        { label: f.selfHost, href: docsUrl(lang, "basic/try-with-docker") },
        { label: f.cloud, href: links.cloud },
      ],
    },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/casdoor-logo_1185x256.png" alt="Casdoor" className="h-7 w-fit" />
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">{f.about}</p>
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
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6">{f.disclaimer}</p>
      </div>
    </footer>
  );
}
