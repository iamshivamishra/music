"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface BeatsFiltersProps {
  genres: string[];
  keys: string[];
  moods: string[];
  currentFilters: Record<string, string>;
}

export function BeatsFilters({ genres, keys, moods, currentFilters }: BeatsFiltersProps) {
  const router = useRouter();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(currentFilters);
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/beats?${params.toString()}`);
    },
    [currentFilters, router]
  );

  const clearFilters = () => router.push("/beats");

  const hasFilters = Object.keys(currentFilters).some(
    (k) => k !== "page" && k !== "limit" && k !== "sort"
  );

  return (
    <div className="space-y-5 rounded-xl border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search beats..."
            className="pl-8"
            defaultValue={currentFilters.search || ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateFilter("search", e.currentTarget.value);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Genre</Label>
        <Select value={currentFilters.genre || "all"} onValueChange={(v) => updateFilter("genre", v ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="All genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Key</Label>
        <Select value={currentFilters.key || "all"} onValueChange={(v) => updateFilter("key", v ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="All keys" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All keys</SelectItem>
            {keys.map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Mood</Label>
        <Select value={currentFilters.mood || "all"} onValueChange={(v) => updateFilter("mood", v ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="All moods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moods</SelectItem>
            {moods.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Sort</Label>
        <Select value={currentFilters.sort || "newest"} onValueChange={(v) => updateFilter("sort", v ?? "newest")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
