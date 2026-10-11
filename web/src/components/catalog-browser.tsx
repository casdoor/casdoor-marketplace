"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchX, X } from "lucide-react";
import { useSearch } from "@/components/catalog-search";
import { TypeIcon } from "@/components/type-icon";
import { getMessages, type Locale } from "@/lib/i18n";
import { links } from "@/lib/site";
import type { IntegrationType } from "@/lib/types";

export type CatalogItem = {
  id: string;
  type: IntegrationType;
  name: string;
  text: string;
  categories: string[];
  tags: string[];
  rank: number;
  updated: string;
  card: ReactNode;
};

type Sort = "featured" | "name" | "updated";

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function count<T>(items: CatalogItem[], key: (i: CatalogItem) => T[]) {
  const counts = new Map<T, number>();
  for (const item of items) {
    for (const k of key(item)) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  render,
}: {
  title: string;
  options: [string, number][];
  selected: string[];
  onToggle: (value: string) => void;
  render?: (value: string) => ReactNode;
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {options.map(([value, n]) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            aria-pressed={active}
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              active ? "bg-accent font-medium text-accent-foreground" : "text-foreground/80 hover:bg-muted"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">{render ? render(value) : value}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

// Every card is in the server-rendered HTML; filtering only hides cards, so crawlers still see all of them.
export function CatalogBrowser({ items, lang, showTypes = true }: { items: CatalogItem[]; lang: Locale; showTypes?: boolean }) {
  const m = getMessages(lang);
  const { query, setQuery } = useSearch();
  const [types, setTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("featured");

  const q = query.trim().toLowerCase();
  const matchesSearch = (i: CatalogItem) => q === "" || i.text.includes(q);
  const matchesType = (i: CatalogItem) => types.length === 0 || types.includes(i.type);
  const matchesCategory = (i: CatalogItem) => categories.length === 0 || i.categories.some((c) => categories.includes(c));
  const matchesTags = (i: CatalogItem) => tags.length === 0 || tags.every((t) => i.tags.includes(t));
  const visible = (i: CatalogItem) => matchesSearch(i) && matchesType(i) && matchesCategory(i) && matchesTags(i);

  // facet counts follow the other active filters, like most stores do
  const typeOptions = count(items.filter((i) => matchesSearch(i) && matchesCategory(i) && matchesTags(i)), (i) => [i.type]);
  const categoryOptions = count(items.filter((i) => matchesSearch(i) && matchesType(i) && matchesTags(i)), (i) => i.categories);
  const tagOptions = count(items.filter((i) => matchesSearch(i) && matchesType(i) && matchesCategory(i)), (i) => i.tags).slice(0, 10);

  const ordered = useMemo(() => {
    const list = [...items];
    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, lang));
    } else if (sort === "updated") {
      list.sort((a, b) => b.updated.localeCompare(a.updated) || a.name.localeCompare(b.name, lang));
    } else {
      list.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, lang));
    }
    return list;
  }, [items, sort, lang]);

  const shown = ordered.filter(visible).length;
  const active = [
    ...types.map((t) => ({ label: m.typeLabels[t as IntegrationType], clear: () => setTypes(toggle(types, t)) })),
    ...categories.map((c) => ({ label: c, clear: () => setCategories(toggle(categories, c)) })),
    ...tags.map((t) => ({ label: t, clear: () => setTags(toggle(tags, t)) })),
    ...(q ? [{ label: `“${query.trim()}”`, clear: () => setQuery("") }] : []),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        {showTypes && (
          <FacetGroup
            title={m.catalog.type}
            options={typeOptions as [string, number][]}
            selected={types}
            onToggle={(v) => setTypes(toggle(types, v))}
            render={(v) => (
              <>
                <TypeIcon type={v as IntegrationType} className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{m.typePlurals[v as IntegrationType]}</span>
              </>
            )}
          />
        )}
        <FacetGroup title={m.catalog.category} options={categoryOptions} selected={categories} onToggle={(v) => setCategories(toggle(categories, v))} />
        <FacetGroup title={m.catalog.capabilities} options={tagOptions} selected={tags} onToggle={(v) => setTags(toggle(tags, v))} />
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{shown}</span> {m.catalog.count(shown)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {active.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.clear}
                className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs hover:bg-muted"
              >
                {a.label}
                <X className="size-3" />
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            {m.catalog.sortBy}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
            >
              <option value="featured">{m.catalog.sortFeatured}</option>
              <option value="name">{m.catalog.sortName}</option>
              <option value="updated">{m.catalog.sortUpdated}</option>
            </select>
          </label>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((i) => (
            <li key={i.id} hidden={!visible(i)}>
              {i.card}
            </li>
          ))}
        </ul>

        {shown === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="font-medium">{m.catalog.emptyTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{m.catalog.emptyText}</p>
            <a href={links.request} className="mt-2 text-sm font-medium text-primary hover:underline">
              {m.catalog.request}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
