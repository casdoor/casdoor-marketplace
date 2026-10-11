import { notFound } from "next/navigation";
import { getMessages } from "@/lib/i18n";
import { getBundle, getIntegrations } from "@/lib/integrations";
import { shareImage } from "@/lib/og";

export const dynamic = "force-static";
export const dynamicParams = false;

// /og/integrations/<id>.png for apps and providers; theme pages are shared with their screenshot instead.
export async function generateStaticParams() {
  const integrations = await getIntegrations();
  return integrations.filter((i) => i.type !== "theme").map((i) => ({ name: `${i.id}.png` }));
}

export async function GET(_request: Request, { params }: RouteContext<"/og/integrations/[name]">) {
  const { name } = await params;
  const integration = (await getIntegrations()).find((i) => `${i.id}.png` === name);
  if (!integration) {
    notFound();
  }
  const guide = (await getBundle(integration)).files["guide.json"];
  return shareImage({
    label: getMessages("en").typeLabels[integration.type],
    title: guide?.headline ?? integration.name.en,
    text: "Step-by-step setup, checked by the Casdoor team",
    logo: integration.logo ? `data/${integration.logo}` : undefined,
  });
}
