"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CartLoadingState() {
  return (
    <div className="page-shell max-w-4xl">
      <h1 className="mb-8 text-3xl font-bold">Your Cart</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="space-y-4 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-20 w-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export function CartEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShoppingCart className="mb-4 h-16 w-16 text-muted-foreground/30" />
      <p className="text-lg font-medium">No items in your cart</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse beats and add tracks you love.
      </p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/beats">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Browse Beats
        </Link>
      </Button>
    </div>
  );
}
