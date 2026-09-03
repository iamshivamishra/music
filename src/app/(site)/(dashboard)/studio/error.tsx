"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell flex items-center justify-center py-24">
      <Card className="max-w-md rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred while loading this page."}
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-muted-foreground/60">
              Error ID: {error.digest}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/studio">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Studio
              </Link>
            </Button>
            <Button onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
