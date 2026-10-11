"use client";

import { usePathname } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMessages, htmlLangs, localePath, locales, type Locale } from "@/lib/i18n";

const localePrefix = new RegExp(`^/(${locales.join("|")})(?=/|$)`);

// The same page in each language, on the current host. The backend sends first-time visitors whose browser prefers
// another language to its pages; the cookie records an explicit choice so that it stops doing so.
export function LanguageSwitcher({ lang }: { lang: Locale }) {
  // /zh/apps/ while prerendering a Chinese page, /en/apps/ or /apps/ for an English one
  const pathname = usePathname() ?? "/";
  let path = pathname.replace(localePrefix, "") || "/";
  if (!path.endsWith("/")) {
    path += "/";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={getMessages(lang).header.language}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted data-popup-open:text-foreground"
      >
        <Languages className="size-4" />
        {getMessages(lang).languageName}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-36">
        {locales.map((l) => (
          <DropdownMenuLinkItem
            key={l}
            href={localePath(l, path)}
            hrefLang={htmlLangs[l]}
            lang={htmlLangs[l]}
            aria-current={l === lang ? "true" : undefined}
            onClick={() => {
              document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
            }}
          >
            {getMessages(l).languageName}
            {l === lang && <Check className="ml-auto text-primary" />}
          </DropdownMenuLinkItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
