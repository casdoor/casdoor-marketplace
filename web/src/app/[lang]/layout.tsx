import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { BaiduTongjiPageview } from "@/components/baidu-tongji";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMessages, htmlLangs, isLocale, siteUrls } from "@/lib/i18n";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// rendered for every request from the catalog in the database (the backend serves it under /data)
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return {};
  }
  const m = getMessages(lang);
  return {
    metadataBase: new URL(siteUrls[lang]),
    title: {
      default: m.siteName,
      template: `%s | ${m.siteName}`,
    },
    description: m.siteDescription,
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon.png", type: "image/png", sizes: "256x256" },
      ],
      apple: "/favicon.png",
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  return (
    <html lang={htmlLangs[lang]} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader lang={lang} />
        <main className="flex-1">{children}</main>
        <SiteFooter lang={lang} />
        <BaiduTongjiPageview />
      </body>
    </html>
  );
}
