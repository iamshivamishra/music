import type { IBeatPack, IBeatPackTier, LicenseType } from "@/types";

export type PackStatus = IBeatPack["status"];

export interface PackCardData {
  _id: string;
  title: string;
  slug: string;
  coverImages: string[];
  genre: string;
  beatCount: number;
  startingPrice: number | null;
  producerName: string;
  producerUsername?: string;
  salesCount?: number;
}

export function getStartingPrice(tiers: IBeatPackTier[]): number | null {
  const active = tiers.filter((t) => t.isActive);
  if (active.length === 0) return null;
  return Math.min(...active.map((t) => t.price));
}

export const TIER_ORDER: LicenseType[] = ["basic", "premium", "unlimited"];

export function sortTiers(tiers: IBeatPackTier[]): IBeatPackTier[] {
  return [...tiers].sort(
    (a, b) => TIER_ORDER.indexOf(a.type) - TIER_ORDER.indexOf(b.type)
  );
}

export function getTierUpgradeDelta(
  currentAmount: number,
  targetTier: IBeatPackTier
): number {
  return Math.max(0, targetTier.price - currentAmount);
}
