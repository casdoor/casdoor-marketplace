import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Casdoor Marketplace",
    template: "%s | Casdoor Marketplace",
  },
  description: "App integrations, provider templates, themes and actions for Casdoor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
            <Link href="/integrations" className="font-semibold">
              Casdoor Marketplace
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="https://casdoor.ai/docs/overview" className="hover:text-foreground">
                Docs
              </a>
              <a href="https://github.com/casdoor/casdoor-integrations" className="hover:text-foreground">
                Contribute
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
        <footer className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground">
            Casdoor Marketplace is open source:{" "}
            <a href="https://github.com/casdoor/casdoor-marketplace" className="underline underline-offset-4">
              casdoor/casdoor-marketplace
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
