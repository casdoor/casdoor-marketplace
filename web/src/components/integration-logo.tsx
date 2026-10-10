import { cn } from "cn";
import { getAssetSrc } from "@/lib/integrations";
import type { Integration } from "@/lib/types";

export async function IntegrationLogo({ integration, className }: { integration: Integration; className?: string }) {
  const src = integration.logo ? await getAssetSrc(integration.logo) : undefined;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cn("size-10 shrink-0 object-contain p-1", className)} />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-semibold text-muted-foreground",
        className
      )}
    >
      {integration.name.en.charAt(0)}
    </div>
  );
}
