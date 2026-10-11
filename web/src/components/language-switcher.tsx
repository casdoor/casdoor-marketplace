"use client";

import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { getMessages, localePath, locales, type Locale } from "@/lib/i18n";

// The same page in the other language. The backend sends first-time visitors whose browser prefers Chinese to the
// Chinese pages; the cookie records an explicit choice so that it stops doing so.
export function LanguageSwitcher({ lang }: { lang: Locale }) {
  // /zh/apps/ while prerendering a Chinese page, /en/apps/ or /apps/ for an English one
  const pathname = usePathname() ?? "/";
  let path = pathname.replace(/^\/(en|zh)(?=\/|$)/, "") || "/";
  if (!path.endsWith("/")) {
    path += "/";
  }
  const other = locales.find((l) => l !== lang) ?? lang;

  return (
    <a
      href={localePath(other, path)}
      hrefLang={other}
      lang={other}
      onClick={() => {
        document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
      aria-label={`${getMessages(lang).header.language}: ${getMessages(other).languageName}`}
      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Languages className="size-4" />
      {getMessages(other).languageName}
    </a>
  );
}
