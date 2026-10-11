import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { IntegrationLogo } from "@/components/integration-logo";
import { TypeIcon } from "@/components/type-icon";
import { getMessages, localePath, translateTag, type Locale } from "@/lib/i18n";
import { getAssetSrc } from "@/lib/integrations";
import type { Integration } from "@/lib/types";

export async function IntegrationCard({ integration, lang }: { integration: Integration; lang: Locale }) {
  const m = getMessages(lang);
  // every card has a banner of the same height: a theme's screenshot, or the logo on a soft gradient
  const screenshot = integration.screenshots?.[0] ? await getAssetSrc(integration.screenshots[0]) : undefined;

  return (
    <Link
      href={localePath(lang, `/integrations/${integration.id}/`)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative h-32 overflow-hidden border-b bg-gradient-to-br from-muted via-background to-accent">
        {screenshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshot}
            alt=""
            className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border bg-background p-3 shadow-sm transition-transform duration-300 group-hover:scale-105">
              <IntegrationLogo integration={integration} className="size-10 p-0 text-xl" />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1 font-semibold">
            <span className="truncate">{integration.name.en}</span>
            {integration.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={m.integration.verifiedShort} />}
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <TypeIcon type={integration.type} className="size-3.5" />
            {m.typeLabels[integration.type]}
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{integration.description.en}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {(integration.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {translateTag(tag, lang)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
