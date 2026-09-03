"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import {
  Package,
  Music,
  FileAudio,
  Layers,
  ShoppingBag,
  Calendar,
} from "lucide-react";
import { tierAccent } from "@/lib/license-ui";
import type { PaginatedResult } from "@/types";
import type { PackPurchaseItem } from "@/lib/services/purchase.service";

interface Props {
  data: PaginatedResult<PackPurchaseItem>;
  currentPage: number;
}


export default function PacksLibraryClient({ data, currentPage }: Props) {
  if (data.total === 0) {
    return (
      <div className="page-shell flex flex-col items-center justify-center py-20 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">No packs yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Purchased beat packs will appear here.
        </p>
        <Button asChild className="mt-4">
          <Link href="/beat-packs">Browse Packs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="page-title">My Packs</h1>
        <p className="text-sm text-muted-foreground">
          {data.total} pack{data.total !== 1 ? "s" : ""} in your library
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.map((item) => (
          <Card
            key={item.purchaseId}
            className="rounded-xl border-border/50 bg-card/70 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {item.packCoverUrl ? (
                  <img
                    src={item.packCoverUrl}
                    alt={item.packTitle}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.packTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    by {item.producerName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${tierAccent(item.packTier)}`}
                    >
                      {item.packTier}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Music className="mr-1 h-3 w-3" />
                      {item.beatCount} beats
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.includesWav && (
                    <span className="flex items-center gap-1">
                      <FileAudio className="h-3.5 w-3.5" />
                      WAV
                    </span>
                  )}
                  {item.includesStems && (
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      Stems
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(item.purchasedAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-sm font-bold">₹{item.amount}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Pagination
        page={currentPage}
        totalPages={data.totalPages}
        getPageUrl={(p) => `/profile/packs?page=${p}`}
      />
    </div>
  );
}
