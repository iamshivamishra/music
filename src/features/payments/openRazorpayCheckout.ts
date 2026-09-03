"use client";

import { toast } from "sonner";
import { loadRazorpayScript } from "@/features/payments/loadRazorpayScript";
import { CHECKOUT_BRAND } from "@/features/payments/brand";
import { tokens } from "@/lib/design-system";
import type { CheckoutOrderDto } from "@/lib/serializers/order";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutSuccess = {
  order?: CheckoutOrderDto;
  downloadToken?: string;
};

interface OpenRazorpayModalOptions {
  orderId: string;
  amount: number;
  description: string;
  prefill?: { email?: string; name?: string };
  verifyUrl?: string;
  failUrl?: string;
  verifyExtra?: Record<string, unknown>;
  failExtra?: Record<string, unknown>;
  onSuccess: (data: RazorpayCheckoutSuccess) => void;
}

async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function openRazorpayModal(
  options: OpenRazorpayModalOptions
): Promise<void> {
  const verifyUrl = options.verifyUrl ?? "/api/payment/verify";
  const failUrl = options.failUrl ?? "/api/payment/fail";

  const razorpay = new window.Razorpay({
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: options.amount * 100,
    currency: "INR",
    name: CHECKOUT_BRAND.name,
    description: options.description,
    order_id: options.orderId,
    prefill: options.prefill,
    handler: async (response: RazorpayHandlerResponse) => {
      try {
        const verifyRes = await postJson(verifyUrl, {
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          ...options.verifyExtra,
        });

        if (verifyRes.ok) {
          const data = (await verifyRes.json()) as RazorpayCheckoutSuccess;
          toast.success("Payment successful!");
          options.onSuccess(data);
        } else {
          const data = await verifyRes.json().catch(() => ({}));
          toast.error(
            (data as { error?: string }).error || "Payment verification failed"
          );
        }
      } catch {
        toast.error("Something went wrong during verification");
      }
    },
    modal: {
      ondismiss: async () => {
        await postJson(failUrl, {
          orderId: options.orderId,
          reason: "Payment cancelled by user",
          ...options.failExtra,
        }).catch(() => {});
      },
    },
    theme: { color: tokens.brand.primaryHex },
  });

  razorpay.open();
}

export async function openRazorpayCheckout(options: {
  createUrl?: string;
  createBody: object;
  description: string;
  prefill?: { email?: string; name?: string };
  verifyUrl?: string;
  failUrl?: string;
  verifyExtra?: Record<string, unknown>;
  failExtra?: Record<string, unknown>;
  onSuccess: (data: RazorpayCheckoutSuccess) => void;
}): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    toast.error("Failed to load payment gateway");
    return;
  }

  const createUrl = options.createUrl ?? "/api/payment/create-order";
  const res = await postJson(createUrl, options.createBody);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    toast.error((err as { error?: string }).error || "Failed to create order");
    return;
  }

  const { orderId, amount } = (await res.json()) as {
    orderId: string;
    amount: number;
  };

  await openRazorpayModal({
    orderId,
    amount,
    description: options.description,
    prefill: options.prefill,
    verifyUrl: options.verifyUrl,
    failUrl: options.failUrl,
    verifyExtra: options.verifyExtra,
    failExtra: options.failExtra,
    onSuccess: options.onSuccess,
  });
}
