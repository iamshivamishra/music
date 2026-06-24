export function tierAccent(type: string): string {
  switch (type) {
    case "basic":
      return "text-primary";
    case "premium":
      return "text-amber-400";
    case "unlimited":
      return "text-violet-400";
    default:
      return "text-primary";
  }
}
