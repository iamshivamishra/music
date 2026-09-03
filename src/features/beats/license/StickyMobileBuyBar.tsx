"use client";

import { BeatCheckoutButton } from "./BeatCheckoutButton";
import { cn } from "@/lib/utils";
import { tierAccent } from "@/lib/license-ui";
import type { LicenseDto } from "@/lib/serializers/license";

export function StickyMobileBuyBar({
  selected,
  isLoggedIn,
  beatId,
  beatTitle,
  ctaVisible,
  hasPlayer,
  accessToken,
}: {
  selected: LicenseDto;
  isLoggedIn: boolean;
  beatId: string;
  beatTitle: string;
  ctaVisible: boolean;
  hasPlayer: boolean;
  accessToken?: string;
}) {
  if (ctaVisible) return null;

  return (
    <div
      role="complementary"
      aria-label="Purchase options"
      className={cn(
        "fixed left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-md px-4 py-3 lg:hidden",
        "motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-200",
        hasPlayer ? "bottom-[60px]" : "bottom-0",
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{selected.name}</p>
          <p className={cn("text-lg font-bold", tierAccent(selected.type))}>
            ₹{selected.price.toLocaleString()}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <BeatCheckoutButton
            isLoggedIn={isLoggedIn}
            beatId={beatId}
            licenseId={selected._id}
            price={selected.price}
            beatTitle={beatTitle}
            licenseType={selected.type}
            accessToken={accessToken}
          />
        </div>
      </div>
    </div>
  );
}
