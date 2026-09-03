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

interface GuestRazorpayButtonProps {
  beatId: string;
  licenseId: string;
  price: number;
  beatTitle: string;
  licenseType: string;
  disabled?: boolean;
  accessToken?: string;
}

export default function GuestRazorpayButton({
  beatId,
  licenseId,
  price,
  beatTitle,
  licenseType,
  disabled,
  accessToken,
}: GuestRazorpayButtonProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGuestCheckout = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await openRazorpayCheckout({
        createUrl: "/api/payment/guest/create-order",
        createBody: {
          beatId,
          licenseId,
          guestEmail: email,
          guestName: name || undefined,
          accessToken,
        },
        description: `${licenseType} License — ${beatTitle}`,
        prefill: { email, name: name || undefined },
        verifyUrl: "/api/payment/guest/verify",
        failUrl: "/api/payment/guest/fail",
        verifyExtra: { guestEmail: email },
        failExtra: { guestEmail: email },
        onSuccess: (data) => {
          if (data.downloadToken) {
            router.push(`/download/${data.downloadToken}`);
          }
        },
      });
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        disabled={disabled}
        className="w-full"
        size="lg"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Buy Now — ₹{price.toLocaleString()}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guest Checkout</DialogTitle>
            <DialogDescription>
              Enter your email to purchase &ldquo;{beatTitle}&rdquo; — no account required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Download links will be available after payment.
              </p>
              {email ? (
                <p className="text-xs text-muted-foreground" role="status">
                  We&apos;ll send downloads to{" "}
                  <strong className="text-foreground">{email}</strong>. Check this
                  — typos cannot be recovered.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-name">Name (optional)</Label>
              <Input
                id="guest-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">{licenseType} License</span>
              <span className="text-lg font-bold">₹{price.toLocaleString()}</span>
            </div>

            <Button
              onClick={handleGuestCheckout}
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
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Pay ₹{price.toLocaleString()} via UPI
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline">
                Sign in
              </a>{" "}
              for a better experience.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
