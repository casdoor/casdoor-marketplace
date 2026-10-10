"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { typeLabels, typeOrder } from "@/lib/site";
import type { IntegrationType } from "@/lib/types";

export type CatalogItem = {
  id: string;
  type: IntegrationType;
  text: string;
  card: ReactNode;
};

// Every card is in the server-rendered HTML; filtering only hides cards, so crawlers still see all of them.
export function Catalog({ items }: { items: CatalogItem[] }) {
  const [type, setType] = useState<IntegrationType | "all">("all");
  const [query, setQuery] = useState("");

  const types = typeOrder.filter((t) => items.some((i) => i.type === t));
  const q = query.trim().toLowerCase();
  const visible = (i: CatalogItem) => (type === "all" || i.type === type) && (q === "" || i.text.includes(q));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search integrations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        {types.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Button variant={type === "all" ? "default" : "outline"} size="sm" onClick={() => setType("all")}>
              All
            </Button>
            {types.map((t) => (
              <Button key={t} variant={type === t ? "default" : "outline"} size="sm" onClick={() => setType(t)}>
                {typeLabels[t]}s
              </Button>
            ))}
          </div>
        )}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.id} hidden={!visible(i)}>
            {i.card}
          </li>
        ))}
      </ul>
      {!items.some(visible) && <p className="text-sm text-muted-foreground">No integrations match.</p>}
    </div>
  );
}
