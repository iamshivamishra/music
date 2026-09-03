"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openRazorpayCheckout } from "@/features/payments/openRazorpayCheckout";
import { loadRazorpayScript } from "@/features/payments/loadRazorpayScript";

interface RazorpayButtonProps {
  beatId: string;
  licenseId: string;
  price: number;
  beatTitle: string;
  licenseType: string;
  disabled?: boolean;
  accessToken?: string;
}

export default function RazorpayButton({
  beatId,
  licenseId,
  price,
  beatTitle,
  licenseType,
  disabled,
  accessToken,
}: RazorpayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      await openRazorpayCheckout({
        createBody: { beatId, licenseId, accessToken },
        description: `${licenseType} License — ${beatTitle}`,
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
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy Now — ₹{price.toLocaleString()}
        </>
      )}
    </Button>
  );
}
