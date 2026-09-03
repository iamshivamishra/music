"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Zap, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/CartProvider";
import PackRazorpayButton from "@/features/payments/PackRazorpayButton";
import type { IBeatPackTier, LicenseType } from "@/types";

const TIER_ICONS: Record<string, typeof Zap> = {
  basic: Zap,
  premium: Crown,
  unlimited: Shield,
};

const TIER_ORDER: LicenseType[] = ["basic", "premium", "unlimited"];

interface PackDetailClientProps {
  packId: string;
  packTitle: string;
  tiers: IBeatPackTier[];
  hasPurchased: boolean;
  existingTier?: string;
  existingAmount?: number;
  isLoggedIn: boolean;
}

export default function PackDetailClient({
  packId,
  packTitle,
  tiers,
  hasPurchased,
  existingTier,
  existingAmount,
  isLoggedIn,
}: PackDetailClientProps) {
  const sortedTiers = [...tiers].sort(
    (a, b) => TIER_ORDER.indexOf(a.type) - TIER_ORDER.indexOf(b.type)
  );
  const [selectedTier, setSelectedTier] = useState<LicenseType>(
    sortedTiers[0]?.type || "basic"
  );
  const { addPackItem } = useCart();
  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);

  const selected = sortedTiers.find((t) => t.type === selectedTier);
  if (!selected) return null;

  const isUpgrade = hasPurchased && existingTier;
  const upgradeDelta =
    isUpgrade && existingAmount != null
      ? selected.price - existingAmount
      : null;

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setAddingToCart(true);
    try {
      await addPackItem(packId, selectedTier);
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Choose a License</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier tabs */}
        <div className="flex gap-2">
          {sortedTiers.map((tier) => {
            const Icon = TIER_ICONS[tier.type] || Zap;
            const isCurrent = tier.type === selectedTier;
            return (
              <button
                key={tier.type}
                onClick={() => setSelectedTier(tier.type)}
                className={`flex flex-1 flex-col items-center rounded-lg border p-3 transition-colors ${
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Icon className={`mb-1 h-5 w-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium capitalize">{tier.type}</span>
                <span className="mt-0.5 text-sm font-bold">
                  ₹{tier.price.toLocaleString("en-IN")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tier details */}
        <div className="space-y-2 rounded-lg bg-muted/50 p-4">
          <h3 className="font-semibold">{selected.name}</h3>
          <ul className="space-y-1.5 text-sm">
            {selected.includesWav && (
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="h-4 w-4 text-green-500" />
                WAV files included
              </li>
            )}
            {selected.includesStems && (
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="h-4 w-4 text-green-500" />
                Stems included
              </li>
            )}
            {selected.commercialUse && (
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="h-4 w-4 text-green-500" />
                Commercial use allowed
              </li>
            )}
            {selected.streamLimit > 0 && (
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="h-4 w-4 text-green-500" />
                Up to {selected.streamLimit.toLocaleString()} streams
              </li>
            )}
            {selected.streamLimit === 0 && (
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited streams
              </li>
            )}
          </ul>
        </div>

        {/* Purchased badge */}
        {hasPurchased && existingTier === selectedTier && (
          <Badge className="w-full justify-center bg-success-text py-1.5 text-primary-foreground">
            <Check className="mr-1 h-4 w-4" />
            Purchased
          </Badge>
        )}

        {/* Buy / Upgrade / Add to Cart */}
        {!hasPurchased && isLoggedIn && (
          <div className="space-y-2">
            <PackRazorpayButton
              packId={packId}
              packTitle={packTitle}
              tierType={selectedTier}
              tierName={selected.name}
              price={selected.price}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        )}

        {isUpgrade && existingTier !== selectedTier && upgradeDelta != null && upgradeDelta > 0 && (
          <PackRazorpayButton
            packId={packId}
            packTitle={packTitle}
            tierType={selectedTier}
            tierName={`Upgrade to ${selected.name}`}
            price={upgradeDelta}
          />
        )}

        {!isLoggedIn && (
          <Button className="w-full" onClick={() => router.push("/login")}>
            Sign in to Purchase
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
