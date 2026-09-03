import { Music, Crown, Infinity as InfinityIcon, Gem } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tierAccent, tierBadge, tierColor, tierSelectedBar, tierIconName } from "@/lib/license-ui";
import type { LicenseDto } from "@/lib/serializers/license";

const TIER_ICONS: Record<string, React.ReactNode> = {
  Music: <Music className="h-5 w-5" />,
  Crown: <Crown className="h-5 w-5" />,
  Infinity: <InfinityIcon className="h-5 w-5" />,
  Gem: <Gem className="h-5 w-5" />,
};

function tierIcon(type: string) {
  return TIER_ICONS[tierIconName(type)] ?? TIER_ICONS.Music;
}

export function TierCardList({
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
            onClick={() => onSelect(id)}
            aria-pressed={isSelected}
            className={cn(
              "relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
              tierColor(lic.type, isSelected),
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

            <div className="flex-1 min-w-0">
              <p className="font-semibold">{lic.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{lic.terms}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className={cn("text-lg font-bold", tierAccent(lic.type))}>
                ₹{lic.price.toLocaleString()}
              </p>
            </div>

            {isSelected && (
              <div className={cn(
                "absolute left-0 top-0 h-full w-1 rounded-l-xl",
                tierSelectedBar(lic.type),
              )} />
            )}
          </button>
        );
      })}

      {licenses.some((l) => l.type === "exclusive") && (
        <p className="text-xs text-yellow-500/80 text-center">
          Buying exclusive removes this beat from the marketplace
        </p>
      )}
    </div>
  );
}
