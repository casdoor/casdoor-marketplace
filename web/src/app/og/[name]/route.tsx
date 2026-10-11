import { notFound } from "next/navigation";
import { getMessages } from "@/lib/i18n";
import { shareImage } from "@/lib/og";
import { collections } from "@/lib/site";

export const dynamic = "force-dynamic";

// /og/home.png and one image per browse page (/og/apps.png, ...). The images are in English for every language.
export async function GET(_request: Request, { params }: RouteContext<"/og/[name]">) {
  const { name } = await params;
  const m = getMessages("en");
  const collection = collections.find((c) => `${c.slug}.png` === name);
  if (!collection) {
    if (name !== "home.png") {
      notFound();
    }
    return shareImage({ label: m.home.badge, title: `${m.home.titleBefore}Casdoor${m.home.titleAfter}`, text: m.siteDescription });
  }
  const text = m.collections[collection.type];
  return shareImage({ label: m.siteName, title: text.title, text: text.tagline });
}
