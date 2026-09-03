"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Music, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tierAccent } from "@/lib/license-ui";
import type { CartItemPopulated, ILicense } from "@/types";

export function CartItemRow({
  item,
  licenses,
  loadingLicenses,
  onRemove,
  onUpdateLicense,
  removing,
}: {
  item: CartItemPopulated;
  licenses: ILicense[];
  loadingLicenses: boolean;
  onRemove: () => void;
  onUpdateLicense: (licenseId: string) => void;
  removing: boolean;
}) {
  return (
    <div className="flex gap-4 py-4">
      <Link href={`/beats/${item.beatId}`} className="shrink-0">
        <div className="relative h-20 w-20 overflow-hidden rounded-lg">
          {item.beatCoverUrl ? (
            <Image
              src={item.beatCoverUrl}
              alt={item.beatTitle}
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
        <Link href={`/beats/${item.beatId}`} className="block truncate font-semibold hover:text-primary">
          {item.beatTitle}
        </Link>
        <p className="text-xs text-muted-foreground">
          by {item.producerName}
        </p>
        <Badge variant="secondary" className="mt-1 text-xs">
          {item.beatGenre}
        </Badge>

        <div className="mt-2">
          {loadingLicenses ? (
            <Skeleton className="h-8 w-32" />
          ) : licenses.length > 0 ? (
            <Select
              value={item.licenseId}
              onValueChange={(v) => v && onUpdateLicense(v)}
            >
              <SelectTrigger className="h-8 w-full max-w-[200px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {licenses.filter((l) => l.isActive).map((lic) => (
                  <SelectItem key={lic._id.toString()} value={lic._id.toString()}>
                    {lic.name} — ₹{lic.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              {item.licenseName}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between">
        <p className={`text-lg font-bold ${tierAccent(item.licenseType)}`}>
          ₹{item.price.toLocaleString()}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${item.beatTitle} from cart`}
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
