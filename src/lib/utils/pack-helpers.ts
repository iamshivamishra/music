import type { IBeatPackTier } from "@/types";

/**
 * Find an active tier by type within a pack's tier list.
 * Centralises the `pack.tiers.find(t => t.type === … && t.isActive)` pattern.
 */
export function findActiveTier(
  pack: { tiers: IBeatPackTier[] },
  type: string
): IBeatPackTier | undefined {
  return pack.tiers.find((t) => t.type === type && t.isActive);
}

/**
 * Find a tier by type (regardless of active status).
 * Used for purchase history / license verification where the tier
 * may have been deactivated after the purchase.
 */
export function findTier(
  pack: { tiers: IBeatPackTier[] },
  type: string
): IBeatPackTier | undefined {
  return pack.tiers.find((t) => t.type === type);
}

/**
 * Find an active tier by type, falling back to basic if the requested tier is missing.
 */
export function findActiveTierWithFallback(
  pack: { tiers: IBeatPackTier[] },
  type: string
): IBeatPackTier | undefined {
  return findActiveTier(pack, type) ?? findActiveTier(pack, "basic");
}
