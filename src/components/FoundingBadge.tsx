import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoundingBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

export function FoundingBadge({
  variant = "compact",
  className,
}: FoundingBadgeProps) {
  if (variant === "full") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30",
          className
        )}
      >
        <Crown className="h-3 w-3" aria-hidden="true" />
        Founding Producer
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-semibold leading-none text-amber-400",
        className
      )}
    >
      Founding
    </span>
  );
}
