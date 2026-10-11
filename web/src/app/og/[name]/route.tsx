import { getMessages } from "@/lib/i18n";
import { shareImage } from "@/lib/og";
import { collections } from "@/lib/site";

export const dynamic = "force-static";
export const dynamicParams = false;

// /og/home.png and one image per browse page (/og/apps.png, ...). The images are in English for every language.
export function generateStaticParams() {
  return ["home", ...collections.map((c) => c.slug)].map((name) => ({ name: `${name}.png` }));
}

export async function GET(_request: Request, { params }: RouteContext<"/og/[name]">) {
  const { name } = await params;
  const m = getMessages("en");
  const collection = collections.find((c) => `${c.slug}.png` === name);
  if (!collection) {
    return shareImage({ label: m.home.badge, title: `${m.home.titleBefore}Casdoor${m.home.titleAfter}`, text: m.siteDescription });
  }
  const text = m.collections[collection.type];
  return shareImage({ label: m.siteName, title: text.title, text: text.tagline });
}
