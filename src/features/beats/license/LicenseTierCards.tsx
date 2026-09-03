import type { ReactNode } from "react";
import { Music, Crown, Infinity, Gem } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tierAccent, tierColor, tierSelectedBar, tierBadge, tierIconName } from "@/lib/license-ui";
import type { LicenseDto } from "@/lib/serializers/license";

const TIER_ICONS: Record<string, ReactNode> = {
  Music: <Music className="h-5 w-5" />,
  Crown: <Crown className="h-5 w-5" />,
  Infinity: <Infinity className="h-5 w-5" />,
  Gem: <Gem className="h-5 w-5" />,
};

function tierIcon(type: string) {
  return TIER_ICONS[tierIconName(type)] ?? TIER_ICONS.Music;
}

export function LicenseTierCards({
  licenses,
  selectedId,
  onSelect,
}: {
  licenses: LicenseDto[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {licenses.map((lic) => {
        const id = lic._id;
        const isSelected = id === selectedId;
        const badge = tierBadge(lic.type);

        return (
          <button
            key={id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(id)}
            className={cn(
              "relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
              tierColor(lic.type, isSelected)
            )}
          >
            {badge && (
              <Badge className={cn("absolute -top-2.5 right-3 text-xs", badge.className)}>
                {badge.label}
              </Badge>
            )}

            <div className={cn("shrink-0 rounded-lg bg-background/50 p-2", tierAccent(lic.type))}>
              {tierIcon(lic.type)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold">{lic.name}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{lic.terms}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className={cn("text-lg font-bold", tierAccent(lic.type))}>
                ₹{lic.price.toLocaleString()}
              </p>
            </div>

            {isSelected && (
              <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", tierSelectedBar(lic.type))} />
            )}
          </button>
        );
      })}
    </div>
  );
}
