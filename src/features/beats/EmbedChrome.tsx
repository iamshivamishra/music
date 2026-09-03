import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmbedTheme } from "@/lib/serializers/embed-types";

export function EmbedChrome({
  theme,
  className,
  children,
}: {
  theme: EmbedTheme;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        theme === "dark" && "dark",
        "border border-border bg-background text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

const PLAY_BUTTON_SIZES = {
  sm: { button: "h-8 w-8", icon: "h-3.5 w-3.5" },
  md: { button: "h-9 w-9", icon: "h-4 w-4" },
  lg: { button: "h-10 w-10", icon: "h-5 w-5" },
} as const;

export function EmbedPlayButton({
  isPlaying,
  onClick,
  label,
  size = "md",
}: {
  isPlaying: boolean;
  onClick: () => void;
  label: string;
  size?: keyof typeof PLAY_BUTTON_SIZES;
}) {
  const dims = PLAY_BUTTON_SIZES[size];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95",
        dims.button
      )}
    >
      {isPlaying ? (
        <Pause className={cn(dims.icon, "fill-current")} />
      ) : (
        <Play className={cn(dims.icon, "ml-0.5 fill-current")} />
      )}
    </button>
  );
}
