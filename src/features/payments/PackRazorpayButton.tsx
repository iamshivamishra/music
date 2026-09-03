"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openRazorpayCheckout } from "@/features/payments/openRazorpayCheckout";
import type { LicenseType } from "@/types";

interface PackRazorpayButtonProps {
  packId: string;
  packTitle: string;
  tierType: LicenseType;
  tierName: string;
  price: number;
  disabled?: boolean;
}

export default function PackRazorpayButton({
  packId,
  packTitle,
  tierType,
  tierName,
  price,
  disabled,
}: PackRazorpayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      await openRazorpayCheckout({
        createBody: { packId, packTier: tierType },
        description: `${tierName} — ${packTitle}`,
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
      onClick={handlePayment}
      disabled={loading || disabled}
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
          <PackageOpen className="mr-2 h-4 w-4" />
          Buy {tierName} — ₹{price.toLocaleString("en-IN")}
        </>
      )}
    </Button>
  );
}
