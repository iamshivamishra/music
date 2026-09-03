"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { openRazorpayCheckout } from "@/features/payments/openRazorpayCheckout";

interface OfferRazorpayButtonProps {
  token: string;
  price: number;
  beatTitle: string;
  licenseName: string;
  isLoggedIn: boolean;
  disabled?: boolean;
}

export default function OfferRazorpayButton({
  token,
  price,
  beatTitle,
  licenseName,
  isLoggedIn,
  disabled,
}: OfferRazorpayButtonProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const startCheckout = async (guestEmail?: string, guestName?: string) => {
    if (!isLoggedIn && !guestEmail) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await openRazorpayCheckout({
        createUrl: "/api/payment/offer/create-order",
        createBody: {
          token,
          ...(guestEmail ? { guestEmail, guestName: guestName || undefined } : {}),
        },
        description: `${licenseName} — ${beatTitle}`,
        prefill: guestEmail ? { email: guestEmail, name: guestName } : undefined,
        verifyUrl: guestEmail ? "/api/payment/guest/verify" : "/api/payment/verify",
        failUrl: guestEmail ? "/api/payment/guest/fail" : "/api/payment/fail",
        verifyExtra: guestEmail ? { guestEmail } : undefined,
        failExtra: guestEmail ? { guestEmail } : undefined,
        onSuccess: (data) => {
          if (data.downloadToken) {
            router.push(`/download/${data.downloadToken}`);
            return;
          }
          if (data.order?.id) {
            router.push(`/checkout/success?orderId=${data.order.id}`);
          }
        },
      });
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return (
      <Button
        onClick={() => startCheckout()}
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
            Buy now — ₹{price.toLocaleString("en-IN")}
          </>
        )}
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        disabled={disabled}
        className="w-full"
        size="lg"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Buy now — ₹{price.toLocaleString("en-IN")}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Enter your email to pay for &ldquo;{beatTitle}&rdquo; — no account required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offer-guest-email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="offer-guest-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-guest-name">Name (optional)</Label>
              <Input
                id="offer-guest-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <Button
              onClick={() => startCheckout(email, name || undefined)}
              disabled={loading || !email}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${price.toLocaleString("en-IN")} via UPI`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
