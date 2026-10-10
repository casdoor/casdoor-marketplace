import { cn } from "cn";
import { TypeIcon } from "@/components/type-icon";
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

  // themes have no logo of their own; their screenshot is shown wherever there is room
  if (integration.type === "theme") {
    return (
      <div aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground", className)}>
        <TypeIcon type="theme" className="size-1/2" />
      </div>
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
