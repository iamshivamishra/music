"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Music, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PackCartItemPopulated } from "@/types";

export function PackCartItemRow({
  item,
  onRemove,
  removing,
}: {
  item: PackCartItemPopulated;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="flex gap-4 py-4">
      <Link href={`/beat-packs/${item.packId}`} className="shrink-0">
        <div className="relative h-20 w-20 overflow-hidden rounded-lg">
          {item.packCoverUrl ? (
            <Image
              src={item.packCoverUrl}
              alt={item.packTitle}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <Music className="h-8 w-8 text-primary/30" />
            </div>
          )}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/beat-packs/${item.packId}`} className="block truncate font-semibold hover:text-primary">
          {item.packTitle}
        </Link>
        <p className="text-xs text-muted-foreground">
          by {item.producerName}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {item.packGenre}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {item.beatCount} beats
          </Badge>
          <Badge className="bg-primary/10 text-xs capitalize text-primary">
            {item.tierName}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <p className="text-lg font-bold text-primary">
          ₹{item.price.toLocaleString()}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${item.packTitle} from cart`}
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
