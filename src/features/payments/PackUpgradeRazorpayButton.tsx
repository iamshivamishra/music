"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openRazorpayCheckout } from "@/features/payments/openRazorpayCheckout";
import type { LicenseType } from "@/types";

interface PackUpgradeRazorpayButtonProps {
  packId: string;
  packTitle: string;
  targetTier: LicenseType;
  targetTierName: string;
  deltaPrice: number;
  disabled?: boolean;
}

export default function PackUpgradeRazorpayButton({
  packId,
  packTitle,
  targetTier,
  targetTierName,
  deltaPrice,
  disabled,
}: PackUpgradeRazorpayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await openRazorpayCheckout({
        createBody: { packId, packTier: targetTier, upgrade: true },
        description: `Upgrade to ${targetTierName} — ${packTitle}`,
        onSuccess: (data) => {
          if (!data.order?.id) return;
          router.push(`/checkout/success?orderId=${data.order.id}`);
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading || disabled || deltaPrice <= 0}
      variant="outline"
      className="w-full"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ArrowUpCircle className="mr-2 h-4 w-4" />
          Upgrade to {targetTierName} — ₹{deltaPrice.toLocaleString("en-IN")}
        </>
      )}
    </Button>
  );
}
