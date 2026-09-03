export function HeroHeader({ cheapestPrice, tierCount }: { cheapestPrice: number; tierCount: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-4">
      <p className="text-sm font-medium text-muted-foreground">Starting at</p>
      <p className="text-2xl font-bold tracking-tight">
        ₹{cheapestPrice.toLocaleString("en-IN")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {tierCount} license {tierCount === 1 ? "tier" : "tiers"} available
      </p>
    </div>
  );
}
