import type { Metadata } from "next";
import { UserConsole } from "@/components/user-console";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/console">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return {};
  }
  const m = getMessages(lang);
  return {
    title: m.console.title,
    description: m.console.description,
    robots: { index: false, follow: false },
  };
}

export default async function ConsolePage({ params }: PageProps<"/[lang]/console">) {
  const { lang } = (await params) as { lang: Locale };
  return <UserConsole lang={lang} />;
}
