import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin | Casdoor Marketplace",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
};

// The admin console has its own root layout: it is in English only and outside the [lang] pages.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-muted/30">{children}</body>
    </html>
  );
}
