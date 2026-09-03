"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import BeatCard from "@/features/beats/BeatCard";
import { toPlayableBeat } from "@/features/beats/playable-beat";
import { usePurchasedBeatIds } from "@/features/beats/usePurchasedBeatIds";
import type { AttributionSource } from "@/types";

export interface BeatQueueGridItem {
  beat: ComponentProps<typeof BeatCard>["beat"];
  startingPrice?: number | null;
}

interface BeatQueueGridProps {
  items: BeatQueueGridItem[];
  className?: string;
  fetchPurchased?: boolean;
  hrefSrc?: AttributionSource;
}

export default function BeatQueueGrid({
  items,
  className,
  fetchPurchased = false,
  hrefSrc,
}: BeatQueueGridProps) {
  const queue = useMemo(
    () => items.map(({ beat }) => toPlayableBeat(beat)),
    [items],
  );

  const beatIds = useMemo(
    () => items.map((item) => item.beat._id.toString()),
    [items],
  );

  const purchasedIds = usePurchasedBeatIds(beatIds, fetchPurchased);

  return (
    <div className={className}>
      {items.map(({ beat, startingPrice }, index) => (
        <BeatCard
          key={beat._id.toString()}
          beat={beat}
          startingPrice={startingPrice ?? undefined}
          isPurchased={purchasedIds.has(beat._id.toString())}
          priority={index < 4}
          queue={queue}
          hrefSrc={hrefSrc}
        />
      ))}
    </div>
  );
}
