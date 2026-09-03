"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Fetches which of the given beat IDs have been purchased by the
 * current user.  Returns a stable Set that only changes when the
 * underlying data changes.
 */
export function usePurchasedBeatIds(
  beatIds: string[],
  enabled = true,
): Set<string> {
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  const key = useMemo(() => beatIds.join(","), [beatIds]);

  useEffect(() => {
    if (!enabled || beatIds.length === 0) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ beatIds: key });

    fetch(`/api/user/purchases/ids?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return { purchasedBeatIds: [] as string[] };
        return (await res.json()) as { purchasedBeatIds?: string[] };
      })
      .then((data) => {
        const next = new Set(
          (data.purchasedBeatIds || []).map((id) => id.toString()),
        );
        setPurchasedIds(next);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch purchased beat IDs:", error);
        setPurchasedIds(new Set());
      });

    return () => controller.abort();
  }, [key, enabled, beatIds.length]);

  return purchasedIds;
}
