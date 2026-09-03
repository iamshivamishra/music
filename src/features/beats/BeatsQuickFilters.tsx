import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  beatsHref,
  QUICK_FILTER_PILLS,
  type BeatsQueryParams,
} from "@/features/beats/beats-query";

interface BeatsQuickFiltersProps {
  currentFilters: BeatsQueryParams;
}

export function BeatsQuickFilters({ currentFilters }: BeatsQuickFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Quick filters">
      {QUICK_FILTER_PILLS.map((pill) => {
        const active = pill.isActive(currentFilters);
        return (
          <Link
            key={pill.id}
            href={beatsHref(currentFilters, pill.patch(active))}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-3 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
            aria-current={active ? "true" : undefined}
          >
            {pill.label}
          </Link>
        );
      })}
    </div>
  );
}
