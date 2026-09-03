"use client";

import { toast } from "sonner";
import { loadRazorpayScript } from "@/features/payments/loadRazorpayScript";
import { openRazorpayModal } from "@/features/payments/openRazorpayCheckout";
import type { CheckoutOrderDto } from "@/lib/serializers/order";

export async function openServiceRazorpayCheckout(options: {
  orderId: string;
  amount: number;
  description: string;
  onSuccess: (order: CheckoutOrderDto) => void;
}): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    toast.error("Failed to load payment gateway");
    return;
  }

  await openRazorpayModal({
    orderId: options.orderId,
    amount: options.amount,
    description: options.description,
    onSuccess: (data) => {
      if (data.order) options.onSuccess(data.order);
    },
  });
}
