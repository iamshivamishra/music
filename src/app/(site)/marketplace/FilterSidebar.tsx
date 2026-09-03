"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENRE_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";

export interface Filters {
  search: string;
  producer: string;
  genre: string;
  mood: string;
  bpmMin: string;
  bpmMax: string;
  sort: string;
}

export const INITIAL_FILTERS: Filters = {
  search: "",
  producer: "",
  genre: "",
  mood: "",
  bpmMin: "",
  bpmMax: "",
  sort: "newest",
};

interface FilterSidebarProps {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterSidebar({
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
}: FilterSidebarProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search by title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Search Title</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Beat title..."
            className="pl-8"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
      </div>

      {/* Search by producer */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Producer</label>
        <Input
          placeholder="Producer name..."
          value={filters.producer}
          onChange={(e) => setFilter("producer", e.target.value)}
        />
      </div>

      <Separator />

      {/* Genre */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Genre</label>
        <Select
          value={filters.genre || "all"}
          onValueChange={(v) => setFilter("genre", !v || v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {GENRE_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mood */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Mood</label>
        <Select
          value={filters.mood || "all"}
          onValueChange={(v) => setFilter("mood", !v || v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All moods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moods</SelectItem>
            {MOOD_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* BPM Range */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">BPM Range</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="40"
            min={40}
            max={300}
            value={filters.bpmMin}
            onChange={(e) => setFilter("bpmMin", e.target.value)}
            className="h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="300"
            min={40}
            max={300}
            value={filters.bpmMax}
            onChange={(e) => setFilter("bpmMax", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
