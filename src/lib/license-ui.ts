export function tierAccent(type: string): string {
  switch (type) {
    case "basic":
      return "text-primary";
    case "premium":
      return "text-amber-400";
    case "unlimited":
      return "text-violet-400";
    case "exclusive":
      return "text-yellow-500";
    default:
      return "text-primary";
  }
}

export function tierBadge(
  type: string,
): { label: string; className: string } | null {
  switch (type) {
    case "premium":
      return { label: "Most Popular", className: "bg-amber-500 text-black" };
    case "unlimited":
      return { label: "Best Value", className: "bg-violet-500 text-white" };
    case "exclusive":
      return { label: "Buyout", className: "bg-yellow-500 text-black" };
    default:
      return null;
  }
}

export function tierColor(type: string, selected: boolean): string {
  if (!selected) return "border-border/50 bg-card/80";
  switch (type) {
    case "basic":
      return "border-primary/50 bg-primary/5 ring-1 ring-primary/20";
    case "premium":
      return "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20";
    case "unlimited":
      return "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20";
    case "exclusive":
      return "border-yellow-500/50 bg-yellow-500/5 ring-1 ring-yellow-500/20";
    default:
      return "border-primary/50 bg-primary/5";
  }
}

export function tierBadgeColor(type: string): string {
  switch (type) {
    case "basic":
      return "bg-primary/20 text-primary";
    case "premium":
      return "bg-amber-500/20 text-amber-400";
    case "unlimited":
      return "bg-violet-500/20 text-violet-400";
    case "exclusive":
      return "bg-yellow-500/20 text-yellow-500";
    default:
      return "";
  }
}

export function tierIconName(type: string): string {
  switch (type) {
    case "basic":
      return "Music";
    case "premium":
      return "Crown";
    case "unlimited":
      return "Infinity";
    case "exclusive":
      return "Gem";
    default:
      return "Music";
  }
}

export function tierSelectedBar(type: string): string {
  switch (type) {
    case "premium":
      return "bg-amber-500";
    case "unlimited":
      return "bg-violet-500";
    case "exclusive":
      return "bg-yellow-500";
    default:
      return "bg-primary";
  }
}
