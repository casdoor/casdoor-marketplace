import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationLogo } from "@/components/integration-logo";
import { getAssetSrc } from "@/lib/integrations";
import { typeLabels } from "@/lib/site";
import type { Integration } from "@/lib/types";

export async function IntegrationCard({ integration }: { integration: Integration }) {
  // a theme is better shown than described, so its card leads with the screenshot
  const screenshot = integration.screenshots?.[0] ? await getAssetSrc(integration.screenshots[0]) : undefined;

  return (
    <Link href={`/integrations/${integration.id}`} className="block h-full">
      <Card className="h-full transition-colors hover:bg-muted/50">
        {screenshot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={screenshot} alt="" className="aspect-[16/10] w-full border-b object-cover object-top" />
        )}
        <CardHeader>
          <div className="flex items-center gap-3">
            {!screenshot && <IntegrationLogo integration={integration} />}
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-1">
                <span className="truncate">{integration.name.en}</span>
                {integration.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />}
              </CardTitle>
              <Badge variant="secondary" className="mt-1">
                {integration.categories[0] ?? typeLabels[integration.type]}
              </Badge>
            </div>
          </div>
          <CardDescription className="mt-2 line-clamp-3">{integration.description.en}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
