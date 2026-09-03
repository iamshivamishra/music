"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ShoppingCart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/CartProvider";
import { useAudioActions } from "@/components/AudioPlayerContext";
import RequestCustomPrice from "@/components/RequestCustomPrice";
import { BeatCheckoutButton } from "./BeatCheckoutButton";
import { LicenseFeatureList } from "./LicenseFeatureList";
import { LicenseTierCards } from "./LicenseTierCards";
import { StickyMobileBuyBar } from "./StickyMobileBuyBar";
import { useCtaVisibility } from "./useCtaVisibility";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { LicenseDto } from "@/lib/serializers/license";

interface Props {
  licenses: LicenseDto[];
  beatId: string;
  beatTitle: string;
  isLoggedIn: boolean;
  hasPurchased: boolean;
  exclusiveSold?: boolean;
  unlisted?: boolean;
  accessToken?: string;
}

export default function LicenseSelector({
  licenses,
  beatId,
  beatTitle,
  isLoggedIn,
  hasPurchased,
  exclusiveSold,
  unlisted: _unlisted,
  accessToken,
}: Props) {
  const { addItem, isInCart } = useCart();
  const { currentBeat } = useAudioActions();
  const [selectedId, setSelectedId] = useState<string>(
    licenses.length > 0 ? licenses[0]._id : ""
  );
  const [adding, setAdding] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaVisible = useCtaVisibility(ctaRef);

  const inCart = isInCart(beatId);

  if (hasPurchased) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-5 text-center">
          <Check className="mx-auto mb-2 h-8 w-8 text-green-400" />
          <p className="font-medium text-green-400">You own a license for this beat</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Download the full untagged track above.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (licenses.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-5 text-center text-muted-foreground">
          No licenses available for this beat.
        </CardContent>
      </Card>
    );
  }

  const selected = licenses.find((l) => l._id === selectedId) || licenses[0];

  const handleAddToCart = async () => {
    setAdding(true);
    await addItem(beatId, selected._id, accessToken);
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">License This Beat</h2>

      <LicenseTierCards
        licenses={licenses}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <LicenseFeatureList license={selected} />

      {selected.type === "exclusive" && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-500">Exclusive License (Buyout)</p>
              <p className="mt-1 text-muted-foreground">
                Purchasing this license removes the beat from the marketplace.
                You receive full exclusive rights. This action is irreversible.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div ref={ctaRef} className="space-y-2">
        <BeatCheckoutButton
          isLoggedIn={isLoggedIn}
          beatId={beatId}
          licenseId={selected._id}
          price={selected.price}
          beatTitle={beatTitle}
          licenseType={selected.type}
          accessToken={accessToken}
        />

        {inCart ? (
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/cart">
              <ShoppingCart className="mr-2 h-4 w-4" />
              View Cart
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleAddToCart}
            disabled={adding}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {adding ? "Adding..." : "Add to Cart"}
          </Button>
        )}
      </div>

      {!exclusiveSold && isFeatureEnabled("customOffers") && (
        <RequestCustomPrice
          beatId={beatId}
          beatTitle={beatTitle}
          isLoggedIn={isLoggedIn}
          accessToken={accessToken}
        />
      )}

      <StickyMobileBuyBar
        selected={selected}
        isLoggedIn={isLoggedIn}
        beatId={beatId}
        beatTitle={beatTitle}
        ctaVisible={ctaVisible}
        hasPlayer={!!currentBeat}
        accessToken={accessToken}
      />
    </div>
  );
}
