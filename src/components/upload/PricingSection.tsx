"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PricingSectionProps {
  priceBasic: string;
  setPriceBasic: (v: string) => void;
  pricePremium: string;
  setPricePremium: (v: string) => void;
  priceUnlimited: string;
  setPriceUnlimited: (v: string) => void;
  priceExclusive: string;
  setPriceExclusive: (v: string) => void;
}

export function PricingSection({
  priceBasic,
  setPriceBasic,
  pricePremium,
  setPricePremium,
  priceUnlimited,
  setPriceUnlimited,
  priceExclusive,
  setPriceExclusive,
}: PricingSectionProps) {
  return (
    <>
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          License Pricing
        </h3>
        <p className="text-xs text-muted-foreground">
          Leave blank to use default platform pricing for each tier.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="priceBasic">Basic License (₹)</Label>
          <Input
            id="priceBasic"
            type="number"
            min={0}
            step="0.01"
            value={priceBasic}
            onChange={(e) => setPriceBasic(e.target.value)}
            placeholder="e.g. 29.99"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricePremium">Premium License (₹)</Label>
          <Input
            id="pricePremium"
            type="number"
            min={0}
            step="0.01"
            value={pricePremium}
            onChange={(e) => setPricePremium(e.target.value)}
            placeholder="e.g. 59.99"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceUnlimited">Unlimited License (₹)</Label>
          <Input
            id="priceUnlimited"
            type="number"
            min={0}
            step="0.01"
            value={priceUnlimited}
            onChange={(e) => setPriceUnlimited(e.target.value)}
            placeholder="e.g. 199.99"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceExclusive">Exclusive License (₹)</Label>
          <Input
            id="priceExclusive"
            type="number"
            min={0}
            step="0.01"
            value={priceExclusive}
            onChange={(e) => setPriceExclusive(e.target.value)}
            placeholder="Optional"
          />
          <p className="text-xs text-muted-foreground">Leave blank to not offer exclusive rights</p>
        </div>
      </div>
    </>
  );
}
