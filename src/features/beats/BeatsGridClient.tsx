"use client";

import BeatQueueGrid from "@/features/beats/BeatQueueGrid";
import type { ComponentProps } from "react";
import type BeatCard from "@/features/beats/BeatCard";

interface BeatsGridClientProps {
  items: Array<{
    beat: ComponentProps<typeof BeatCard>["beat"];
    startingPrice: number | null;
  }>;
}

export default function BeatsGridClient({ items }: BeatsGridClientProps) {
  return (
    <BeatQueueGrid
      items={items}
      fetchPurchased
      className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    />
  );
}
