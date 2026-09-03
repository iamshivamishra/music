const BEATS_PATH = "/beats";

type BeatsQueryKey =
  | "search"
  | "genre"
  | "key"
  | "mood"
  | "bpmMin"
  | "bpmMax"
  | "priceMin"
  | "priceMax"
  | "sort"
  | "page"
  | "limit";

export type BeatsQueryParams = Partial<Record<BeatsQueryKey, string>>;

const NON_FILTER_KEYS = new Set<BeatsQueryKey>(["page", "limit", "sort"]);

export function hasActiveDiscoveryFilters(params: BeatsQueryParams): boolean {
  return Object.keys(params).some(
    (k) => !NON_FILTER_KEYS.has(k as BeatsQueryKey) && params[k as BeatsQueryKey]
  );
}

export function beatsHref(
  current: BeatsQueryParams,
  patch: Record<string, string | null>
): string {
  const params = new URLSearchParams(current as Record<string, string>);
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.delete("page");
  const query = params.toString();
  return query ? `${BEATS_PATH}?${query}` : BEATS_PATH;
}

export function parseFilterBound(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function rangePatch(
  [lo, hi]: [number, number],
  minKey: string,
  maxKey: string,
  rangeMin: number,
  rangeMax: number
): Record<string, string | null> {
  return {
    [minKey]: lo === rangeMin ? null : String(lo),
    [maxKey]: hi === rangeMax ? null : String(hi),
  };
}

export const QUICK_PRICE_UNDER = [500, 1000] as const;
export const QUICK_BPM_RANGES = [
  [60, 90],
  [120, 150],
] as const;

export interface QuickFilterPill {
  id: string;
  label: string;
  isActive: (filters: BeatsQueryParams) => boolean;
  patch: (active: boolean) => Record<string, string | null>;
}

export const QUICK_FILTER_PILLS: QuickFilterPill[] = [
  ...QUICK_PRICE_UNDER.map((max) => ({
    id: `under-${max}`,
    label: `Under ₹${max.toLocaleString("en-IN")}`,
    isActive: (filters: BeatsQueryParams) =>
      filters.priceMax === String(max) && !filters.priceMin,
    patch: (active: boolean): Record<string, string | null> =>
      active ? { priceMax: null } : { priceMin: null, priceMax: String(max) },
  })),
  ...QUICK_BPM_RANGES.map(([min, max]) => ({
    id: `bpm-${min}-${max}`,
    label: `${min}–${max} BPM`,
    isActive: (filters: BeatsQueryParams) =>
      filters.bpmMin === String(min) && filters.bpmMax === String(max),
    patch: (active: boolean): Record<string, string | null> =>
      active
        ? { bpmMin: null, bpmMax: null }
        : { bpmMin: String(min), bpmMax: String(max) },
  })),
];
