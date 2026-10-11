import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { getMessages, localePath, locales } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "404 | Casdoor Marketplace",
};

// build/404.html, which the backend returns for every unknown address; it cannot tell the language, so it has both.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full items-center justify-center bg-muted/30 px-4">
        <div className="flex flex-col items-center gap-8 py-20 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/casdoor-logo_1185x256.png" alt="Casdoor" className="h-8 w-auto" />
          <p className="text-6xl font-semibold tracking-tight text-primary">404</p>
          {locales.map((lang) => {
            const m = getMessages(lang).notFound;
            return (
              <div key={lang} lang={lang} className="flex flex-col items-center gap-2">
                <h1 className="text-xl font-semibold">{m.title}</h1>
                <p className="text-muted-foreground">{m.text}</p>
                <a href={localePath(lang, "/")} className="text-sm font-medium text-primary hover:underline">
                  {m.home}
                </a>
              </div>
            );
          })}
        </div>
      </body>
    </html>
  );
}
