"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CartCouponField } from "./CartCouponField";
import type { CartItemPopulated, PackCartItemPopulated } from "@/types";

export function CartSummary({
  items,
  packItems,
  isGuest,
  payableTotal,
  couponCode,
  couponApplied,
  couponError,
  couponLoading,
  checkingOut,
  onCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  onCheckout,
}: {
  items: CartItemPopulated[];
  packItems: PackCartItemPopulated[];
  isGuest: boolean;
  payableTotal: number;
  couponCode: string;
  couponApplied: { code: string; totalDiscount: number } | null;
  couponError: string | null;
  couponLoading: boolean;
  checkingOut: boolean;
  onCodeChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.beatId} className="flex justify-between">
                <span className="truncate pr-2 text-muted-foreground">
                  {item.beatTitle}
                </span>
                <span className="shrink-0 font-medium">
                  ₹{item.price.toLocaleString()}
                </span>
              </div>
            ))}
            {packItems.map((item) => (
              <div key={item.packId} className="flex justify-between">
                <span className="truncate pr-2 text-muted-foreground">
                  {item.packTitle} ({item.tierName})
                </span>
                <span className="shrink-0 font-medium">
                  ₹{item.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {packItems.length > 0 && !isGuest && (
            <CartCouponField
              couponCode={couponCode}
              couponApplied={couponApplied}
              couponError={couponError}
              couponLoading={couponLoading}
              onCodeChange={onCodeChange}
              onApply={onApplyCoupon}
              onRemove={onRemoveCoupon}
            />
          )}

          <Separator />

          {couponApplied && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-₹{couponApplied.totalDiscount.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">
              ₹{payableTotal.toLocaleString()}
            </span>
          </div>

          {isGuest ? (
            <div className="space-y-2">
              <p className="text-center text-xs text-muted-foreground">
                Sign in to proceed to checkout. Your cart will be saved.
              </p>
              <Button asChild className="w-full" size="lg">
                <Link href="/login">
                  Sign in to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={onCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating order...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Checkout — ₹{payableTotal.toLocaleString()}
                </>
              )}
            </Button>
          )}

          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/beats">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
