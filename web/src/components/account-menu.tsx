"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, LogIn, LogOut, Settings } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, signinUrl, signout, type Account } from "@/lib/account";
import { getMessages, localePath, type Locale } from "@/lib/i18n";

export function UserAvatar({ name, avatar, className }: { name: string; avatar: string; className?: string }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt="" className={`rounded-full object-cover ${className ?? "size-6"}`} />;
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground uppercase ${className ?? "size-6"}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}

// The sign-in button of the header, or the signed-in user's menu with the console. Pages are the same for everyone,
// so the account is read in the browser.
export function AccountMenu({ lang }: { lang: Locale }) {
  const m = getMessages(lang).header;
  const [account, setAccount] = useState<Account | null>(null);
  const consolePath = localePath(lang, "/console/");

  useEffect(() => {
    api<Account>("/api/get-account")
      .then(setAccount)
      .catch(() => setAccount({ user: null, hasCasdoor: false, hasDatabase: false }));
  }, []);

  if (!account) {
    return <span className="ml-1 h-7 w-[4.5rem]" aria-hidden />;
  }
  if (!account.hasCasdoor) {
    return null;
  }

  const user = account.user;
  if (!user) {
    return (
      // the backend redirects to Casdoor, so this is a full page load
      <a href={signinUrl(consolePath)} className={buttonVariants({ variant: "outline", size: "sm", className: "ml-1" })}>
        <LogIn />
        {m.signin}
      </a>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={m.console}
        className="ml-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted"
      >
        <UserAvatar name={user.displayName || user.name} avatar={user.avatar} />
        <span className="hidden max-w-32 truncate sm:inline">{user.displayName || user.name}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">
            {user.owner}/{user.name}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem href={consolePath}>
          <LayoutDashboard />
          {m.console}
        </DropdownMenuLinkItem>
        {user.isAdmin && (
          <DropdownMenuLinkItem href="/admin/">
            <Settings />
            {m.settings}
          </DropdownMenuLinkItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signout();
            window.location.reload();
          }}
        >
          <LogOut />
          {m.signout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
