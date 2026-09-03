"use client";

import { Check, Loader2, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CartCouponField({
  couponCode,
  couponApplied,
  couponError,
  couponLoading,
  onCodeChange,
  onApply,
  onRemove,
}: {
  couponCode: string;
  couponApplied: { code: string; totalDiscount: number } | null;
  couponError: string | null;
  couponLoading: boolean;
  onCodeChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
}) {
  if (couponApplied) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-success-text/30 bg-success-bg px-3 py-2 text-sm">
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-success-text" aria-hidden="true" />
          <span className="font-mono font-semibold">{couponApplied.code}</span>
          <span className="text-success-text">-₹{couponApplied.totalDiscount.toLocaleString("en-IN")}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Remove coupon"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Ticket className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            placeholder="Coupon code"
            value={couponCode}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply();
              }
            }}
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 font-mono text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Coupon code"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={onApply}
          disabled={couponLoading || !couponCode.trim()}
        >
          {couponLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {couponError && (
        <p className="text-xs text-destructive" role="alert">{couponError}</p>
      )}
    </div>
  );
}
