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
import {
  BPM_FILTER_MAX,
  BPM_FILTER_MIN,
  BPM_FILTER_STEP,
  PRICE_FILTER_MAX,
  PRICE_FILTER_MIN,
  PRICE_FILTER_STEP,
} from "@/lib/validators/beat";
import { RangeFilter } from "@/components/ui/range-filter";
import {
  beatsHref,
  hasActiveDiscoveryFilters,
  parseFilterBound,
  rangePatch,
  type BeatsQueryParams,
} from "@/features/beats/beats-query";

interface BeatsFiltersProps {
  genres: string[];
  keys: string[];
  moods: string[];
  currentFilters: BeatsQueryParams;
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onValueChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BeatsFilters({ genres, keys, moods, currentFilters }: BeatsFiltersProps) {
  const router = useRouter();

  const navigate = useCallback(
    (patch: Record<string, string | null>, mode: "push" | "replace") => {
      const href = beatsHref(currentFilters, patch);
      if (mode === "replace") router.replace(href);
      else router.push(href);
    },
    [currentFilters, router]
  );

  const updateFilter = useCallback(
    (key: string, value: string) => {
      navigate({ [key]: value && value !== "all" ? value : null }, "push");
    },
    [navigate]
  );

  const clearFilters = () => router.push("/beats");
  const searchId = "beats-search-input";
  const hasFilters = hasActiveDiscoveryFilters(currentFilters);

  const bpmRange: [number, number] = [
    parseFilterBound(currentFilters.bpmMin, BPM_FILTER_MIN),
    parseFilterBound(currentFilters.bpmMax, BPM_FILTER_MAX),
  ];
  const priceRange: [number, number] = [
    parseFilterBound(currentFilters.priceMin, PRICE_FILTER_MIN),
    parseFilterBound(currentFilters.priceMax, PRICE_FILTER_MAX),
  ];

  return (
    <div className="surface space-y-5 p-4">
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
        <Label htmlFor={searchId} className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id={searchId}
            placeholder="Search beats..."
            className="pl-8"
            defaultValue={currentFilters.search || ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateFilter("search", e.currentTarget.value);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Press Enter to apply search.</p>
      </div>

      <FilterSelect
        label="Genre"
        value={currentFilters.genre || "all"}
        placeholder="All genres"
        options={genres}
        onValueChange={(v) => updateFilter("genre", v ?? "all")}
      />

      <FilterSelect
        label="Key"
        value={currentFilters.key || "all"}
        placeholder="All keys"
        options={keys}
        onValueChange={(v) => updateFilter("key", v ?? "all")}
      />

      <FilterSelect
        label="Mood"
        value={currentFilters.mood || "all"}
        placeholder="All moods"
        options={moods}
        onValueChange={(v) => updateFilter("mood", v ?? "all")}
      />

      <RangeFilter
        label="BPM Range"
        min={BPM_FILTER_MIN}
        max={BPM_FILTER_MAX}
        step={BPM_FILTER_STEP}
        value={bpmRange}
        formatRange={(lo, hi) => `${lo} – ${hi} BPM`}
        onCommit={(next) =>
          navigate(rangePatch(next, "bpmMin", "bpmMax", BPM_FILTER_MIN, BPM_FILTER_MAX), "replace")
        }
      />

      <RangeFilter
        label="Price Range"
        min={PRICE_FILTER_MIN}
        max={PRICE_FILTER_MAX}
        step={PRICE_FILTER_STEP}
        value={priceRange}
        formatRange={(lo, hi) =>
          `₹${lo.toLocaleString("en-IN")} – ₹${hi.toLocaleString("en-IN")}`
        }
        onCommit={(next) =>
          navigate(
            rangePatch(next, "priceMin", "priceMax", PRICE_FILTER_MIN, PRICE_FILTER_MAX),
            "replace"
          )
        }
      />

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
