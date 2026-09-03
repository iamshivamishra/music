"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BeatDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <div className="page-shell flex min-h-[60vh] items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Failed to load beat</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while loading this beat. Please try again.
        </p>
        <Button onClick={reset} className="mt-6">
          Try Again
        </Button>
      </div>
    </div>
  );
}
