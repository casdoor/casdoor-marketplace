"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

const SearchContext = createContext<{ query: string; setQuery: (q: string) => void }>({
  query: "",
  setQuery: () => {},
});

// Shares the search text between the hero's search box and the catalog below it.
export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  return useContext(SearchContext);
}

export function HeroSearch({ placeholder }: { placeholder: string }) {
  const { query, setQuery } = useSearch();
  return (
    <form
      role="search"
      className="relative w-full max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search integrations"
        className="h-14 w-full rounded-xl border border-white/10 bg-white pr-4 pl-12 text-base text-foreground shadow-2xl shadow-black/30 outline-none placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-primary/40"
      />
    </form>
  );
}
